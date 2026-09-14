const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let calls=[],failure=null;
const member={id:'self',company_id:'company',full_name:null,role:'employee'};
const other={id:'other',full_name:'Other person'};
const source=fs.readFileSync('app/tradeos-cloud-static.js','utf8').replace('\nstart();','\n').replace(/\}\)\(\);\s*$/, 'globalThis.api={needsName,saveMyName,set(v){data=v;}};})();');
const sb={rpc:async(name,args)=>{calls.push({name,args});return {error:failure};}};
const context={window:{supabase:{createClient:()=>sb}},document:{getElementById:()=>({}),addEventListener(){}},Intl,Date};vm.runInNewContext(source,context);const api=context.api;
api.set({activeMembership:member,members:[member,other]});
(async()=>{
assert.equal(api.needsName(null),true);assert.equal(api.needsName('Employee'),true);assert.equal(api.needsName('Jo Smith'),false);
await assert.rejects(()=>api.saveMyName('Employee'));assert.equal(calls.length,0);
await api.saveMyName('  Jo Smith  ');assert.equal(calls[0].args.target_company,'company');assert.equal(calls[0].name,'update_my_membership_name');assert.equal(member.full_name,'Jo Smith');assert.equal(other.full_name,'Other person');assert.equal(member.role,'employee');
failure={message:'Network error'};await assert.rejects(()=>api.saveMyName('New name'));assert.equal(member.full_name,'Jo Smith');
console.log('PASS: missing-name gate, role-label rejection, scoped self name save, unchanged role and error preservation.');
})().catch(e=>{console.error(e);process.exit(1);});
