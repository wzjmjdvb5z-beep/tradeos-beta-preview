const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app/job-detail-v1.js','utf8').replace("  new MutationObserver(schedule)","  globalThis.api={set(v){current=v;},performJobAction,jobStage};\n  new MutationObserver(schedule)");
let calls=[],events=[],next={data:'job'},removed=0;
const error={hidden:true},buttons=[{},{}];
const overlay={querySelectorAll:()=>buttons,querySelector:()=>error,remove(){removed++;}};
const doc={addEventListener(){},dispatchEvent(e){events.push(e.type);},querySelector:()=>null,createElement:()=>({remove(){}}),body:{appendChild(){},classList:{remove(){}}},readyState:'loading'};
const ctx={window:{supabase:{createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return next;}})}},document:doc,MutationObserver:class{observe(){}},CustomEvent:class{constructor(type){this.type=type;}},Intl,Date,setTimeout(){}};
vm.runInNewContext(source,ctx);const api=ctx.api;
function state(role){return {ctx:{companyId:'company',membership:{role}},job:{id:'job'},overlay};}
(async()=>{
api.set(state('employee'));await api.performJobAction('delete');assert.equal(calls.length,0);
api.set(state('owner'));next={error:{message:'Protected history'}};await api.performJobAction('delete');assert.equal(error.textContent,'Protected history');assert.equal(events.length,0);assert.equal(buttons[0].disabled,false);
api.set(state('owner'));next={data:'job'};await api.performJobAction('delete');assert.equal(calls.at(-1).args.target_job,'job');assert.equal(calls.at(-1).args.target_company,'company');assert.deepEqual(events,['tradeos:jobs-changed']);
assert.equal(api.jobStage({status:'booked'}),'Ready');assert.equal(api.jobStage({status:'complete',billing_stage:'bill paid'}),'Bill paid');
console.log('PASS: employee denied, deletion errors preserved, confirmed delete refreshes, stage labels.');
})();
