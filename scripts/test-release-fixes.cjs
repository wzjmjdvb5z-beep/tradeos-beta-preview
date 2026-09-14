const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function section(path,start,end){const s=fs.readFileSync(path,'utf8');const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,path);return s.slice(a,b);}
async function main(){
  // Invoice picker must retain privately priced jobs, quote jobs and voided invoice jobs.
  let markup='';
  const body={set innerHTML(v){markup=v;},querySelector(){return null;}};
  const c={num:v=>Number(v)||0,esc:String,money:{format:v=>'GBP '+v},futureIso:()=>'',sheet:()=>({querySelector:()=>body}),document:{body:{appendChild(){}}},emptyState:()=>'',};
  vm.createContext(c);
  vm.runInContext(section('app/commercial-v1.js','  function openInvoiceCreate','  function ',),c);
  c.openInvoiceCreate({jobs:[
    {id:'private',title:'Private job',agreed_value:0},
    {id:'quote',title:'Quote job',agreed_value:0,quote_id:'q'},
    {id:'existing',title:'Already billed',agreed_value:50},
    {id:'void',title:'Voided job',agreed_value:50},
    {id:'empty',title:'No price',agreed_value:0}
  ],profitability:[{job_id:'private',agreed_value:125}],invoices:[{job_id:'existing',status:'sent'},{job_id:'void',status:'void'}]});
  assert.ok(markup.includes('Private job')&&markup.includes('GBP 125'));
  assert.ok(markup.includes('Quote job')&&markup.includes('Voided job'));
  assert.ok(!markup.includes('Already billed')&&!markup.includes('No price'));

  // Native CSV sends a real CSV payload through the bridge, and allows retry after error/cancel.
  let calls=[],messages=[],fail=false;
  const csvContext={n:v=>Number(v)||0,toast:m=>messages.push(m),window:{tradeOSNative:{isNative:true,exportCSV:async o=>{calls.push(o);if(fail)throw Error('Share failed');return {completed:false};}}}};
  vm.createContext(csvContext);
  const csvSource=fs.readFileSync('app/timesheet-manager-v1.js','utf8');
  const csvStart=csvSource.indexOf('  let exportingCSV=false;');
  const csvEnd=csvSource.indexOf('\n  new MutationObserver',csvStart);
  assert.ok(csvStart>=0&&csvEnd>csvStart);
  vm.runInContext(csvSource.slice(csvStart,csvEnd),csvContext);
  const d={members:[{user_id:'u',full_name:'A "B"',hourly_cost:20}],sheets:[{id:'s',user_id:'u',week_start:'2026-09-14',status:'approved'}],entries:[{weekly_timesheet_id:'s',hours:2}]};
  await csvContext.exportWeek(d,'2026-09-14',40,1.5);
  assert.equal(calls.length,1);assert.ok(calls[0].csv.includes('"A ""B"""'));assert.ok(calls[0].csv.includes('"40.00"'));assert.ok(calls[0].title.startsWith('veystead-'));
  fail=true;await csvContext.exportWeek(d,'2026-09-14',40,1.5);assert.ok(messages.includes('Share failed'));
  fail=false;await csvContext.exportWeek(d,'2026-09-14',40,1.5);assert.equal(calls.length,3);

  // Ignore a second submit while pending; reconcile a lost response against saved status.
  let resolveWrite,rpcCount=0,notices=[];
  const state={sheet:{id:'s',status:'draft'}},button={isConnected:true};
  const t={ctx:state,client:{rpc:()=>{rpcCount++;return new Promise(r=>resolveWrite=r);}},reloadData:async()=>{state.sheet.status='submitted';},render(){},prettyError:e=>e.message,
    document:{querySelector:s=>s==='#tos-submit'?button:{appendChild:n=>notices.push(n.textContent)},createElement:()=>({setAttribute(){}})}};
  vm.createContext(t);
  vm.runInContext(section('app/timesheet-clean.js','  const submittingSheets','  async function reopenWeek'),t);
  const first=t.submitWeek();await t.submitWeek();assert.equal(rpcCount,1);
  resolveWrite({error:{message:'Lost response'}});await first;
  assert.ok(notices.includes('Timesheet submitted for approval'));
  state.sheet.status='draft';t.reloadData=async()=>{};const rejected=t.submitWeek();resolveWrite({error:{message:'Job is no longer assigned'}});await rejected;
  assert.ok(notices.includes('Job is no longer assigned'));
  console.log('PASS: private invoice selection, native CSV cancel/error retry and timesheet submission recovery.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
