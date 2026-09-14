const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let role='owner',requests=[],pending=[];
const client={auth:{getUser:async()=>({data:{user:{id:'user'}}})},from(table){const query={select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},maybeSingle(){return this;},then(resolve){requests.push(table);return Promise.resolve(resolve({data:table==='company_members'?{id:'member',company_id:'company',role}:[],error:null}));}};return query;},rpc(name){requests.push(name);return new Promise(resolve=>pending.push(()=>resolve({data:name==='get_company_document_profile'?{name:'Test trader'}:[],error:null})));}};
const source=fs.readFileSync('app/commercial-v1.js','utf8').replace('  new MutationObserver(', '  globalThis.loadCommercial=loadContext;\n  new MutationObserver(');
const context={window:{supabase:{createClient:()=>client},addEventListener(){}},document:{querySelector:()=>null,addEventListener(){},readyState:'loading'},MutationObserver:class{observe(){}},Intl,Date};
vm.runInNewContext(source,context);
(async()=>{
await context.loadCommercial('quotes');assert.deepEqual(requests,['company_members','quotes','customers','jobs']);
requests=[];const finance=context.loadCommercial('finance');await new Promise(setImmediate);assert.equal(pending.length,2,'Both finance RPCs must start concurrently');assert.ok(!requests.includes('quotes'));assert.ok(requests.includes('invoices'));pending.splice(0).forEach(resolve=>resolve());const result=await finance;assert.equal(result.companyProfile.name,'Test trader');
requests=[];role='employee';await context.loadCommercial('finance');assert.deepEqual(requests,['company_members']);
console.log('PASS: Quotes skips five unrelated finance requests; finance RPCs start together; employees make no commercial data queries.');
})().catch(e=>{console.error(e);process.exit(1);});
