(function(){
'use strict';
const STORE='tradeos_beta_local_v1';
try{localStorage.removeItem('tradeos_beta_session')}catch(_){ }
try{sessionStorage.removeItem('tradeos_beta_session')}catch(_){ }
let state={jobs:[],timesheets:[]};
const el=id=>document.getElementById(id);
const money=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const hours=n=>Number(n||0).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')+'h';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function load(){try{const raw=JSON.parse(localStorage.getItem(STORE)||'null');if(raw&&Array.isArray(raw.jobs)&&Array.isArray(raw.timesheets))state=raw}catch(_){}}
function save(msg){localStorage.setItem(STORE,JSON.stringify(state));render();if(msg)toast(msg)}
function toast(msg){const t=el('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2200)}
function jobTimesheets(jobId){return state.timesheets.filter(t=>t.jobId===jobId)}
function approved(jobId){return jobTimesheets(jobId).filter(t=>t.status==='Approved')}
function labour(jobId){return approved(jobId).reduce((sum,t)=>sum+(Number(t.hours)||0)*(Number(t.rate)||0),0)}
function approvedHours(jobId){return approved(jobId).reduce((sum,t)=>sum+(Number(t.hours)||0),0)}
function profit(j){return Number(j.quote||0)-Number(j.materialCost||0)-Number(j.otherCost||0)-labour(j.id)}
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(){
 el('homeJobs').textContent=state.jobs.length;
 el('homeHours').textContent=hours(state.jobs.reduce((s,j)=>s+approvedHours(j.id),0));
 const jobs=el('jobsList');
 if(!state.jobs.length) jobs.innerHTML='<div class="card empty">No jobs yet.</div>';
 else jobs.innerHTML=state.jobs.map(j=>'<div class="card"><div class="title">'+esc(j.title)+'</div><div class="muted">'+esc(j.customer)+' · '+esc(j.assignee||'Unassigned')+'</div><div class="row"><span>Quote</span><strong>'+money(j.quote)+'</strong></div><div class="row"><span>Approved labour</span><strong>'+money(labour(j.id))+'</strong></div><div class="row"><span>Gross profit</span><strong class="green">'+money(profit(j))+'</strong></div><button class="btn btn2" data-delete-job="'+j.id+'">Delete job</button></div>').join('');
 const select=el('tsJob');
 select.innerHTML=state.jobs.length?state.jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' — '+esc(j.customer)+'</option>').join(''):'<option value="">Create a job first</option>';
 const list=el('timesheetList');
 if(!state.timesheets.length) list.innerHTML='<div class="empty">No timesheets yet.</div>';
 else list.innerHTML=state.timesheets.map(t=>{const j=state.jobs.find(x=>x.id===t.jobId);return '<div class="card entry '+t.status.toLowerCase()+'"><div class="title">'+esc(t.employee)+'</div><div class="muted small">'+esc(j?j.title:'Deleted job')+' · '+hours(t.hours)+' · '+money(t.rate)+'/h</div><p>'+esc(t.notes||'')+'</p><div class="row"><span>Status</span><strong>'+t.status+'</strong></div>'+(t.status==='Submitted'?'<div class="actions"><button class="btn" data-approve="'+t.id+'">Approve</button><button class="btn danger" data-reject="'+t.id+'">Reject</button></div>':'')+'</div>'}).join('');
 const moneyList=el('moneyList');
 if(!state.jobs.length) moneyList.innerHTML='<div class="card empty">Create a job to see costing.</div>';
 else moneyList.innerHTML=state.jobs.map(j=>'<div class="card"><div class="title">'+esc(j.title)+'</div><div class="row"><span>Revenue</span><strong>'+money(j.quote)+'</strong></div><div class="row"><span>Materials</span><strong>'+money(j.materialCost)+'</strong></div><div class="row"><span>Other costs</span><strong>'+money(j.otherCost)+'</strong></div><div class="row"><span>Approved labour</span><strong>'+money(labour(j.id))+'</strong></div><div class="row"><span>Gross profit</span><strong class="green">'+money(profit(j))+'</strong></div></div>').join('');
}
el('enquiryForm').addEventListener('submit',e=>{e.preventDefault();const q=Number(el('quote').value)||0;if(q<=0){toast('Enter a quote value.');return}state.jobs.unshift({id:uid(),customer:el('customer').value.trim(),title:el('title').value.trim(),assignee:el('assignee').value.trim(),notes:el('notes').value.trim(),quote:q,materialCost:Number(el('materialCost').value)||0,otherCost:Number(el('otherCost').value)||0,createdAt:new Date().toISOString()});e.target.reset();el('quote').value='1000';el('materialCost').value='300';el('otherCost').value='50';save('Job created.');location.hash='jobs'});
el('submitTime').addEventListener('click',()=>{const jobId=el('tsJob').value,employee=el('tsEmployee').value.trim(),h=Number(el('tsHours').value),rate=Number(el('tsRate').value);if(!jobId){toast('Create a job first.');return}if(!employee){toast('Enter the employee name.');return}if(!h||h<=0||h>18){toast('Hours must be between 0.25 and 18.');return}state.timesheets.unshift({id:uid(),jobId,employee,hours:h,rate:Math.max(0,rate||0),notes:el('tsNotes').value.trim(),status:'Submitted',createdAt:new Date().toISOString()});el('tsNotes').value='';save('Timesheet submitted.');});
document.addEventListener('click',e=>{const a=e.target.getAttribute('data-approve'),r=e.target.getAttribute('data-reject'),d=e.target.getAttribute('data-delete-job');if(a){const t=state.timesheets.find(x=>x.id===a);if(t){t.status='Approved';save('Timesheet approved.')}}if(r){const t=state.timesheets.find(x=>x.id===r);if(t){t.status='Rejected';save('Timesheet rejected.')}}if(d){state.jobs=state.jobs.filter(j=>j.id!==d);state.timesheets=state.timesheets.filter(t=>t.jobId!==d);save('Job deleted.')}});
el('copyFeedback').addEventListener('click',async()=>{const text='TradeOS beta feedback\n\nWhat worked:\n'+el('fbWorked').value+'\n\nWhat was confusing or broken:\n'+el('fbBroken').value+'\n\nWhat would make me switch:\n'+el('fbSwitch').value;try{await navigator.clipboard.writeText(text);toast('Feedback copied.')}catch(_){toast('Copy failed — select the text manually.')}});
el('reset').addEventListener('click',()=>{if(confirm('Delete all local beta jobs and timesheets?')){state={jobs:[],timesheets:[]};save('Local beta data reset.')}});
load();render();
})();
