const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');

async function testRateSave(){
  const calls=[];
  const input={value:'18.50'},status={textContent:''};
  const sb={auth:{},from(){throw new Error('Rate save must not update the membership row directly');},rpc:async(name,args)=>{calls.push({name,args});return name==='get_member_cost_rates'?{data:[{member_id:'member',hourly_cost:18.5}],error:null}:{error:null};}};
  let source=fs.readFileSync('app/team-rates.js','utf8').replace("  if(document.readyState==='loading')","  globalThis.api={saveRate};\n  if(document.readyState==='loading')");
  const document={readyState:'loading',addEventListener(){},querySelector:s=>s.includes('rate-input')?input:status,querySelectorAll:()=>[]};
  const context={window:{supabase:{createClient:()=>sb},CSS:{escape:String}},document,MutationObserver:class{},requestAnimationFrame(){},setTimeout(){}};
  vm.createContext(context);vm.runInContext(source,context);
  const button={dataset:{rateSave:'member'},textContent:'Save',disabled:false};
  await context.api.saveRate(button,'company');
  assert.equal(JSON.stringify(calls),JSON.stringify([
    {name:'set_member_cost_rate',args:{target_company:'company',target_member:'member',target_rate:18.5}},
    {name:'get_member_cost_rates',args:{target_company:'company'}}
  ]));
  assert.match(status.textContent,/Saved at £18\.50/);
}

async function testPricingPermission(){
  const calls=[];let label={textContent:''};
  const sb={auth:{},from(){},rpc:async(name,args)=>{calls.push({name,args});return {error:null};}};
  let source=fs.readFileSync('app/pricing-access-v1.js','utf8').replace('  new MutationObserver(()=>','  globalThis.api={canSeePricing,memberRow,savePermission,setContext:v=>ctx=v};\n  new MutationObserver(()=>');
  const document={readyState:'loading',addEventListener(){},querySelector:s=>s.includes('pricing-label')?label:null,querySelectorAll:()=>[],createElement:()=>({remove(){}}),body:{classList:{toggle(){}},appendChild(){}}};
  const context={window:{supabase:{createClient:()=>sb},CSS:{escape:String}},document,MutationObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){}};
  vm.createContext(context);vm.runInContext(source,context);
  assert.equal(context.api.canSeePricing({role:'employee',can_view_pricing:true}),true);
  assert.equal(context.api.canSeePricing({role:'employee',can_view_pricing:false}),false);
  const employee=context.api.memberRow({id:'employee',full_name:'Employee',role:'employee',can_view_pricing:true});
  const owner=context.api.memberRow({id:'owner',full_name:'Owner',role:'owner',can_view_pricing:false});
  assert.match(employee,/checked/);assert.doesNotMatch(employee,/checked disabled/);
  assert.match(owner,/checked disabled/);
  context.api.setContext({companyId:'company'});
  const input={dataset:{pricingToggle:'employee'},checked:true,disabled:false};
  await context.api.savePermission(input);
  assert.equal(JSON.stringify(calls),JSON.stringify([{name:'set_member_pricing_access',args:{target_company:'company',target_member:'employee',allowed:true}}]));
  assert.equal(label.textContent,'Pricing visible');
}

(async()=>{
  await testRateSave();await testPricingPermission();
  const manager=fs.readFileSync('app/timesheet-manager-v1.js','utf8');
  const main=fs.readFileSync('app/tradeos-cloud-static.js','utf8');
  assert.match(manager,/rpc\('set_member_cost_rate'/);
  assert.doesNotMatch(manager,/from\('company_members'\)\.update\(\{hourly_cost/);
  assert.match(main,/if\(api==='update_member_cost'\).*rpc\('set_member_cost_rate'/);
  assert.doesNotMatch(main,/from\('company_members'\)\.update\(\{hourly_cost/);
  const sql=fs.readFileSync('scripts/job-delete-team-permissions.sql','utf8');
  for(const table of ['payments','invoices','weekly_time_entries','timesheets','job_timer_sessions','job_note_files','job_notes','job_materials','expenses','job_assignments','jobs'])assert.match(sql,new RegExp(`delete from public\\.${table}\\b`));
  console.log('PASS: rate RPC, employee pricing permission and complete linked job cleanup are wired.');
})().catch(e=>{console.error(e);process.exitCode=1;});
