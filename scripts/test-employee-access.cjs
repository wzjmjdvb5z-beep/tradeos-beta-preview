const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

async function check(role){
  const requests=[];
  const member={id:'self-member',user_id:'self',company_id:'company',role,active:true,companies:{name:'Test company'}};
  const rows=[{id:'owner-member',user_id:'someone-else',company_id:'company',role:'owner',active:true},member];
  const sb={auth:{getUser:async()=>({data:{user:{id:'self',email:'test@example.invalid'}}})},
    rpc:async()=>({data:[],error:null}),
    from(table){
      const filters=[];let columns='';
      const q={select(s){columns=s;return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},limit(){return q;},
        then(resolve){requests.push({table,columns,filters});let data=table==='company_members'?rows:[];for(const [k,v] of filters)data=data.filter(r=>r[k]===v);return Promise.resolve({data,error:null}).then(resolve);}};
      return q;
    }};
  let source=fs.readFileSync('app/tradeos-cloud-static.js','utf8').replace('start();','');
  source=source.replace(/\}\)\(\);\s*$/,'this.run=async()=>{data=await bootstrap();return {role:data.activeMembership.role,nav:nav("quotes","£","Quotes")+nav("finance","£","Finance"),jobs:jobs(["owner","admin","manager"].includes(data.activeMembership.role)),team:team(["owner","admin","manager"].includes(data.activeMembership.role))};};})();');
  const c={window:{supabase:{createClient:()=>sb}},document:{getElementById:()=>null},console,Intl,Date};
  vm.createContext(c);vm.runInContext(source,c);
  const result=await c.run();
  assert.equal(result.role,role,'must use the signed-in user, even when owner is first');
  if(role==='employee'){
    assert.equal(result.nav,'');
    assert(!result.jobs.includes('id="jobform"'));
    assert(!result.jobs.includes('data-assign='));
    assert(!result.team.includes('id="inviteform"'));
    assert(!result.team.includes('data-save-cost'));
    assert(!requests.some(r=>['quotes','invoices','job_materials'].includes(r.table)));
  }else{
    assert(result.nav.includes('data-nav="finance"'));
    assert(result.jobs.includes('id="jobform"'));
    assert(result.team.includes('id="inviteform"'));
  }
  assert(!requests.find(r=>r.table==='weekly_timesheets').columns.includes('hourly_cost'));
}
(async()=>{await check('employee');await check('owner');console.log('PASS: employee/owner membership isolation, navigation, actions and financial query boundaries.');})().catch(e=>{console.error(e);process.exitCode=1;});
