(function(){
'use strict';
const STORE='tradeos_beta_local_v2';
try{localStorage.removeItem('tradeos_beta_session')}catch(_){ }
try{sessionStorage.removeItem('tradeos_beta_session')}catch(_){ }
const seed=()=>({
 team:[
  {id:'m1',name:'Ben',email:'owner@tradeos.demo',role:'Owner',status:'Active'},
  {id:'m2',name:'Jack',email:'jack@tradeos.demo',role:'Employee',status:'Active'}
 ],
 jobs:[
  {id:'j1',customer:'Miller Homes',title:'Consumer unit upgrade',assignee:'m2',notes:'Replace board, test and label circuits.',quote:1850,materialCost:430,otherCost:55,createdAt:new Date().toISOString()},
  {id:'j2',customer:'Oak & Co',title:'Kitchen first fix',assignee:'m2',notes:'Sockets, lighting and cooker feed.',quote:2400,materialCost:610,otherCost:80,createdAt:new Date().toISOString()}
 ],
 timesheets:[
  {id:'t1',jobId:'j1',employeeId:'m2',employee:'Jack',hours:7.5,rate:25,notes:'Board installed and tested.',status:'Approved',createdAt:new Date().toISOString()},
  {id:'t2',jobId:'j2',employeeId:'m2',employee:'Jack',hours:8,rate:25,notes:'First fix completed downstairs.',status:'Submitted',createdAt:new Date().toISOString()}
 ]
});
let state=seed();
const el=id=>document.getElementById(id);
const money=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:2});
const hours=n=>Number(n||0).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')+'h';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function load(){try{const raw=JSON.parse(localStorage.getItem(STORE)||'null');if(raw&&Array.isArray(raw.jobs)&&Array.isArray(raw.timesheets)&&Array.isArray(raw.team))state=raw;else localStorage.setItem(STORE,JSON.stringify(state))}catch(_){localStorage.setItem(STORE,JSON.stringify(state))}}
function save(msg){localStorage.setItem(STORE,JSON.stringify(state));render();if(msg)toast(msg)}
function toast(msg){const t=el('toast');if(!t)return;t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2200)}
function jobTimesheets(jobId){return state.timesheets.filter(t=>t.jobId===jobId)}
function approved(jobId){return jobTimesheets(jobId).filter(t=>t.status==='Approved')}
function labour(jobId){return approved(jobId).reduce((sum,t)=>sum+(Number(t.hours)||0)*(Number(t.rate)||0),0)}
function approvedHours(jobId){return approved(jobId).reduce((sum,t)=>sum+(Number(t.hours)||0),0)}
function profit(j){return Number(j.quote||0)-Number(j.materialCost||0)-Number(j.otherCost||0)-labour(j.id)}
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function person(id){return state.team.find(m=>m.id===id)}
function totalValue(){return state.jobs.reduce((s,j)=>s+Number(j.quote||0),0)}
function totalProfit(){return state.jobs.reduce((s,j)=>s+profit(j),0)}
function totalCost(){return state.jobs.reduce((s,j)=>s+Number(j.materialCost||0)+Number(j.otherCost||0)+labour(j.id),0)}
function render(){
 el('homeJobs').textContent=state.jobs.length;
 el('homeHours').textContent=hours(state.jobs.reduce((s,j)=>s+approvedHours(j.id),0));
 el('homeValue').textContent=money(totalValue());
 el('homeProfit').textContent=money(totalProfit());

 const jobs=el('jobsList');
 if(!state.jobs.length) jobs.innerHTML='<div class="card empty">No jobs yet.</div>';
 else jobs.innerHTML=state.jobs.map(j=>{const p=person(j.assignee);const gp=profit(j);return '<div class="card"><div class="statusline"><span class="pill">Booked</span><span class="pill gray">'+esc(p?p.name:'Unassigned')+'</span></div><div class="title" style="margin-top:10px">'+esc(j.title)+'</div><div class="muted">'+esc(j.customer)+'</div><div class="row"><span>Agreed value</span><strong>'+money(j.quote)+'</strong></div><div class="row"><span>Approved labour</span><strong>'+money(labour(j.id))+'</strong></div><div class="row"><span>Materials + expenses</span><strong>'+money(Number(j.materialCost||0)+Number(j.otherCost||0))+'</strong></div><div class="row"><span>Gross job profit</span><strong class="'+(gp>=0?'moneyPositive':'moneyNegative')+'">'+money(gp)+'</strong></div><button class="btn btn2" data-delete-job="'+j.id+'">Delete demo job</button></div>'}).join('');

 const teamList=el('teamList');
 teamList.innerHTML=state.team.map(m=>'<div class="card"><div class="teamline"><div class="person"><div class="avatar">'+esc((m.name||'?').slice(0,1).toUpperCase())+'</div><div><div class="title">'+esc(m.name)+'</div><div class="muted small">'+esc(m.email)+'</div></div></div><span class="pill '+(m.status==='Pending'?'orange':'')+'">'+esc(m.role)+'</span></div><div class="row"><span>Status</span><strong>'+esc(m.status)+'</strong></div></div>').join('');

 const assignee=el('assignee');
 assignee.innerHTML='<option value="">Unassigned</option>'+state.team.filter(m=>m.status==='Active').map(m=>'<option value="'+m.id+'">'+esc(m.name)+' — '+esc(m.role)+'</option>').join('');
 const select=el('tsJob');
 select.innerHTML=state.jobs.length?state.jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' — '+esc(j.customer)+'</option>').join(''):'<option value="">Create a job first</option>';
 const emp=el('tsEmployee');
 emp.innerHTML=state.team.filter(m=>m.role==='Employee'&&m.status==='Active').map(m=>'<option value="'+m.id+'">'+esc(m.name)+'</option>').join('')||'<option value="">Invite an employee first</option>';

 const list=el('timesheetList');
 if(!state.timesheets.length) list.innerHTML='<div class="empty">No timesheets yet.</div>';
 else list.innerHTML=state.timesheets.map(t=>{const j=state.jobs.find(x=>x.id===t.jobId);return '<div class="card entry '+t.status.toLowerCase()+'"><div class="title">'+esc(t.employee)+'</div><div class="muted small">'+esc(j?j.title:'Deleted job')+' · '+hours(t.hours)+' · '+money(t.rate)+'/h</div><p>'+esc(t.notes||'')+'</p><div class="row"><span>Status</span><strong>'+esc(t.status)+'</strong></div>'+(t.status==='Submitted'?'<div class="actions"><button class="btn" data-approve="'+t.id+'">Approve</button><button class="btn danger" data-reject="'+t.id+'">Return</button></div>':'')+'</div>'}).join('');

 const value=totalValue(),cost=totalCost(),gp=totalProfit(),margin=value?Math.round((gp/value)*100):0;
 el('moneySummary').innerHTML='<div class="grid"><div class="card"><div class="muted">Portfolio value</div><div class="kpi">'+money(value)+'</div></div><div class="card"><div class="muted">Total costs</div><div class="kpi">'+money(cost)+'</div></div><div class="card"><div class="muted">Gross job profit</div><div class="kpi green">'+money(gp)+'</div></div><div class="card"><div class="muted">Margin</div><div class="kpi green">'+margin+'%</div></div></div>';
 const moneyList=el('moneyList');
 if(!state.jobs.length) moneyList.innerHTML='<div class="card empty">Create a job to see costing.</div>';
 else moneyList.innerHTML=state.jobs.map(j=>'<div class="card"><div class="title">'+esc(j.title)+'</div><div class="row"><span>Agreed value</span><strong>'+money(j.quote)+'</strong></div><div class="row"><span>Materials</span><strong>'+money(j.materialCost)+'</strong></div><div class="row"><span>Expenses</span><strong>'+money(j.otherCost)+'</strong></div><div class="row"><span>Approved labour</span><strong>'+money(labour(j.id))+'</strong></div><div class="row"><span>Gross job profit</span><strong class="green">'+money(profit(j))+'</strong></div></div>').join('');
}

el('enquiryForm').addEventListener('submit',e=>{e.preventDefault();const q=Number(el('quote').value)||0;if(q<=0){toast('Enter an agreed value.');return}state.jobs.unshift({id:uid(),customer:el('customer').value.trim(),title:el('title').value.trim(),assignee:el('assignee').value,notes:el('notes').value.trim(),quote:q,materialCost:Number(el('materialCost').value)||0,otherCost:Number(el('otherCost').value)||0,createdAt:new Date().toISOString()});e.target.reset();el('quote').value='1800';el('materialCost').value='420';el('otherCost').value='55';save('Demo job created.');location.hash='jobs'});
el('inviteEmployee').addEventListener('click',()=>{const name=el('inviteName').value.trim(),email=el('inviteEmail').value.trim().toLowerCase();if(!name||!email.includes('@')){toast('Enter a name and valid email.');return}state.team.push({id:uid(),name,email,role:'Employee',status:'Pending'});el('inviteName').value='';el('inviteEmail').value='';save('Demo employee invite created.');});
el('submitTime').addEventListener('click',()=>{const jobId=el('tsJob').value,employeeId=el('tsEmployee').value,h=Number(el('tsHours').value),rate=Number(el('tsRate').value),m=person(employeeId);if(!jobId){toast('Create a job first.');return}if(!m){toast('Choose an employee.');return}if(!h||h<=0||h>18){toast('Hours must be between 0.25 and 18.');return}state.timesheets.unshift({id:uid(),jobId,employeeId,employee:m.name,hours:h,rate:Math.max(0,rate||0),notes:el('tsNotes').value.trim(),status:'Submitted',createdAt:new Date().toISOString()});el('tsNotes').value='';save('Timesheet submitted for approval.');});
document.addEventListener('click',e=>{const target=e.target;if(!(target instanceof HTMLElement))return;const a=target.getAttribute('data-approve'),r=target.getAttribute('data-reject'),d=target.getAttribute('data-delete-job');if(a){const t=state.timesheets.find(x=>x.id===a);if(t){t.status='Approved';save('Timesheet approved — profitability updated.')}}if(r){const t=state.timesheets.find(x=>x.id===r);if(t){t.status='Rejected';save('Timesheet returned to employee.')}}if(d){state.jobs=state.jobs.filter(j=>j.id!==d);state.timesheets=state.timesheets.filter(t=>t.jobId!==d);save('Demo job deleted.')}});
el('copyFeedback').addEventListener('click',async()=>{const text='TradeOS beta feedback\n\nWhat worked:\n'+el('fbWorked').value+'\n\nWhat was confusing or broken:\n'+el('fbBroken').value+'\n\nWhat would make me switch:\n'+el('fbSwitch').value;try{await navigator.clipboard.writeText(text);toast('Feedback copied.')}catch(_){toast('Copy failed — select the text manually.')}});
el('reset').addEventListener('click',()=>{if(confirm('Reset this browser to the preloaded TradeOS demo?')){state=seed();save('Demo reset.')}});
load();render();
})();
