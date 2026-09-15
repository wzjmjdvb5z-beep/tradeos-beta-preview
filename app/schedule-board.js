(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let active=false,loading=false,mode='week',weekStart=mondayIso(new Date()),memberFilter='all',ctx=null,observerBusy=false;
  const managerRoles=['owner','admin','manager'];

  function start(){
    if(!client)return;
    new MutationObserver(scheduleMount).observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      const nav=e.target.closest?.('[data-nav]');
      if(nav&&nav.dataset.nav!=='schedule')active=false;
    },true);
    scheduleMount();
  }

  function scheduleMount(){
    if(observerBusy)return;
    observerBusy=true;
    requestAnimationFrame(()=>{observerBusy=false;mount();});
  }

  function mount(){
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    let button=nav.querySelector('[data-nav="schedule"]');
    if(!button){
      button=document.createElement('button');
      button.className='nav tos-schedule-nav';
      button.dataset.nav='schedule';
      button.innerHTML='<b>▦</b><span>Schedule</span>';
      const home=nav.querySelector('[data-nav="home"]');
      if(home?.nextSibling)nav.insertBefore(button,home.nextSibling);else nav.prepend(button);
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openSchedule();});
    }
    button.classList.toggle('active',active);
    if(active&&!document.querySelector('.tos-schedule-shell'))renderSchedule();
  }

  async function openSchedule(){
    active=true;
    document.querySelectorAll('.bottom-nav .nav').forEach(x=>x.classList.toggle('active',x.dataset.nav==='schedule'));
    await renderSchedule();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function loadContext(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)throw userError||new Error('Please sign in again.');
    let companyId=document.querySelector('#company')?.value||null;
    let mine=null;
    if(companyId){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      if(r.error)throw r.error;mine=r.data;
    }
    if(!mine){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(r.error)throw r.error;mine=r.data;companyId=mine?.company_id||null;
    }
    if(!mine||!companyId)throw new Error('No active Veystead workspace found.');
    const isManager=managerRoles.includes(mine.role);
    const [jobsR,membersR,assignR]=await Promise.all([
      client.from('jobs').select('id,company_id,title,status,address,scheduled_start,scheduled_end,notes,created_at').eq('company_id',companyId).order('scheduled_start',{ascending:true,nullsFirst:false}).limit(500),
      client.from('company_members').select('id,user_id,full_name,role,active').eq('company_id',companyId).eq('active',true).order('created_at',{ascending:true}),
      client.from('job_assignments').select('id,job_id,member_id').eq('company_id',companyId).limit(1000)
    ]);
    for(const r of [jobsR,membersR,assignR])if(r.error)throw r.error;
    return{user,mine,companyId,isManager,jobs:jobsR.data||[],members:membersR.data||[],assignments:assignR.data||[]};
  }

  async function renderSchedule(){
    if(!active||loading)return;
    const wrap=document.querySelector('main.wrap');if(!wrap)return;
    loading=true;
    wrap.innerHTML='<div class="tos-schedule-shell"><section class="card section"><div class="empty">Loading schedule…</div></section></div>';
    try{ctx=await loadContext();draw(wrap);}catch(err){wrap.innerHTML=`<div class="tos-schedule-shell"><section class="card section"><div class="error">${esc(err?.message||'Could not load the schedule.')}</div></section></div>`;}finally{loading=false;}
  }

  function draw(wrap){
    if(!active||!ctx)return;
    const visibleJobs=getVisibleJobs();
    const weekDays=daysOfWeek(weekStart);
    const todayIso=localIso(new Date());
    const scheduled=visibleJobs.filter(j=>j.scheduled_start);
    const unscheduled=visibleJobs.filter(j=>!j.scheduled_start);
    const clashes=ctx.isManager?findAllClashes(ctx.jobs,ctx.assignments):[];
    const hours=sum(scheduled.filter(j=>inWeek(j.scheduled_start,weekStart)).map(jobHours));
    wrap.innerHTML=`<div class="tos-schedule-shell">
      <section class="tos-schedule-hero"><div><p class="eyebrow">${ctx.isManager?'SCHEDULE & DISPATCH':'MY SCHEDULE'}</p><h2>${ctx.isManager?'Plan the team.':'Know where you need to be.'}</h2><p>${ctx.isManager?'Assign jobs, spot clashes and keep the week moving.':'Your assigned jobs and times in one place.'}</p></div>${ctx.isManager?'<button class="btn" id="tos-schedule-unscheduled">+ Schedule job</button>':''}</section>
      <section class="card tos-schedule-toolbar"><div class="tos-view-switch"><button class="tos-view-btn ${mode==='today'?'active':''}" data-schedule-view="today">Today</button><button class="tos-view-btn ${mode==='week'?'active':''}" data-schedule-view="week">Week</button></div><div class="tos-week-switch"><button class="tos-week-btn" id="tos-prev-week">‹</button><button class="tos-week-btn" id="tos-this-week">Today</button><span class="tos-week-title">${fmtDay(weekDays[0])} – ${fmtDay(weekDays[6])}</span><button class="tos-week-btn" id="tos-next-week">›</button></div>${ctx.isManager?`<select id="tos-member-filter" class="tos-week-btn"><option value="all">All team</option>${ctx.members.map(m=>`<option value="${esc(m.id)}" ${memberFilter===m.id?'selected':''}>${esc(m.full_name||'Unnamed')}</option>`).join('')}</select>`:''}</section>
      <section class="tos-schedule-summary">${scheduleStat('Scheduled this week',scheduled.filter(j=>inWeek(j.scheduled_start,weekStart)).length)}${scheduleStat('Planned hours',fmtHours(hours))}${scheduleStat(ctx.isManager?'Unscheduled jobs':'Today',ctx.isManager?unscheduled.length:scheduled.filter(j=>dateIso(j.scheduled_start)===todayIso).length)}${scheduleStat(ctx.isManager?'Clashes':'Assigned jobs',ctx.isManager?clashes.length:visibleJobs.length)}</section>
      ${unscheduled.length?renderUnscheduled(unscheduled):''}
      ${!ctx.isManager&&!visibleJobs.length?'<section class="card section"><div class="empty">No jobs assigned yet. Your manager can assign you from Jobs → Manage team.</div></section>':''}
      ${mode==='today'?renderToday(visibleJobs,todayIso):renderWeek(visibleJobs,weekDays,todayIso)}
    </div>`;
    bindSchedule();
  }

  function getVisibleJobs(){
    if(!ctx)return[];
    let jobs=ctx.jobs.slice();
    if(!ctx.isManager){
      const own=new Set(ctx.assignments.filter(a=>a.member_id===ctx.mine.id).map(a=>a.job_id));
      jobs=jobs.filter(j=>own.has(j.id));
    }else if(memberFilter!=='all'){
      const assigned=new Set(ctx.assignments.filter(a=>a.member_id===memberFilter).map(a=>a.job_id));
      jobs=jobs.filter(j=>assigned.has(j.id));
    }
    return jobs;
  }

  function renderUnscheduled(jobs){
    return `<section class="card tos-unscheduled"><div class="tos-unscheduled-head"><div><h3>${ctx.isManager?'Unscheduled jobs':'Awaiting dates'}</h3><p class="sub">${ctx.isManager?'Set a date and assign the team to show a job in their calendar.':'These jobs are assigned to you. Your manager needs to set a date before they appear in the calendar.'}</p></div></div><div class="tos-unscheduled-list">${jobs.map(j=>`<div class="tos-unscheduled-job"><div><strong>${esc(j.title)}</strong><small>${esc(j.address||'No site address')}</small></div>${ctx.isManager?`<button class="tos-mini-btn" data-schedule-job="${esc(j.id)}">Schedule</button>`:'<span class="sub">Date to be confirmed</span>'}</div>`).join('')}</div></section>`;
  }

  function renderWeek(jobs,days,todayIso){
    return `<section class="tos-week-grid">${days.map(day=>{const iso=localIso(day),dayJobs=jobs.filter(j=>dateIso(j.scheduled_start)===iso).sort(byStart);return `<div class="tos-day-column ${iso===todayIso?'today':''}"><div class="tos-day-head"><div><strong>${weekday(day)}</strong><small>${longShort(day)}</small></div><span class="tos-day-total">${dayJobs.length} job${dayJobs.length===1?'':'s'}</span></div><div class="tos-day-jobs">${dayJobs.length?dayJobs.map(scheduleJobCard).join(''):`<div class="tos-empty-day">No jobs scheduled</div>`}</div></div>`}).join('')}</section>`;
  }

  function renderToday(jobs,todayIso){
    const dayJobs=jobs.filter(j=>dateIso(j.scheduled_start)===todayIso).sort(byStart);
    return `<section class="tos-today-list">${dayJobs.length?dayJobs.map(j=>{const people=jobPeople(j.id);return `<div class="tos-today-card ${ctx.isManager?'clickable':''}" ${ctx.isManager?`data-schedule-job="${esc(j.id)}"`:''}><div class="tos-today-time">${timeRange(j)}</div><div><h4>${esc(j.title)}</h4><div class="tos-today-meta">${esc(j.address||'No address')} · ${esc(j.status==='booked'?'Ready':j.status||'Ready')}</div>${people.length?`<div class="tos-assignees">${people.map(p=>`<span class="tos-person-chip">${esc(p.full_name||'Team member')}</span>`).join('')}</div>`:''}</div></div>`}).join(''):`<section class="card section"><div class="empty">Nothing scheduled for today.</div></section>`}</section>`;
  }

  function scheduleJobCard(j){
    const people=jobPeople(j.id);
    return `<div class="tos-schedule-job ${ctx.isManager?'clickable':''}" ${ctx.isManager?`data-schedule-job="${esc(j.id)}"`:''}><div class="tos-job-time"><strong>${timeRange(j)}</strong><span class="tos-job-status">${esc(j.status==='booked'?'Ready':j.status||'Ready')}</span></div><div class="tos-job-title">${esc(j.title)}</div>${j.address?`<div class="tos-job-address">${esc(j.address)}</div>`:''}${people.length?`<div class="tos-assignees">${people.map(p=>`<span class="tos-person-chip">${esc(p.full_name||'Team member')}</span>`).join('')}</div>`:''}</div>`;
  }

  function bindSchedule(){
    document.querySelectorAll('[data-schedule-view]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.scheduleView;draw(document.querySelector('main.wrap'));}));
    document.querySelector('#tos-prev-week')?.addEventListener('click',()=>{weekStart=addDaysIso(weekStart,-7);draw(document.querySelector('main.wrap'));});
    document.querySelector('#tos-next-week')?.addEventListener('click',()=>{weekStart=addDaysIso(weekStart,7);draw(document.querySelector('main.wrap'));});
    document.querySelector('#tos-this-week')?.addEventListener('click',()=>{weekStart=mondayIso(new Date());draw(document.querySelector('main.wrap'));});
    document.querySelector('#tos-member-filter')?.addEventListener('change',e=>{memberFilter=e.target.value;draw(document.querySelector('main.wrap'));});
    document.querySelectorAll('[data-schedule-job]').forEach(b=>b.addEventListener('click',()=>openJobSheet(b.dataset.scheduleJob)));
    document.querySelector('#tos-schedule-unscheduled')?.addEventListener('click',()=>openJobPicker());
  }

  function openJobPicker(){
    const unscheduled=ctx.jobs.filter(j=>!j.scheduled_start);
    const overlay=document.createElement('div');overlay.className='tos-schedule-sheet';
    overlay.innerHTML=`<div class="tos-schedule-panel"><div class="tos-sheet-handle"></div><h3>Schedule a job</h3><p class="sub">Choose a job waiting to be added to the diary.</p><div class="tos-unscheduled-list">${unscheduled.length?unscheduled.map(j=>`<button class="tos-unscheduled-job" style="width:100%;text-align:left;color:inherit" data-pick-job="${esc(j.id)}"><div><strong>${esc(j.title)}</strong><small>${esc(j.address||'No site address')}</small></div><span>›</span></button>`).join(''):'<div class="empty">All jobs are scheduled.</div>'}</div><div class="tos-sheet-actions"><button class="tos-sheet-cancel" id="tos-picker-close">Close</button><span></span></div></div>`;
    document.body.appendChild(overlay);const close=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)close()});overlay.querySelector('#tos-picker-close')?.addEventListener('click',close);overlay.querySelectorAll('[data-pick-job]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.pickJob;close();openJobSheet(id);}));
  }

  function openJobSheet(jobId){
    if(!ctx?.isManager)return;
    const job=ctx.jobs.find(j=>j.id===jobId);if(!job)return;
    const start=job.scheduled_start?new Date(job.scheduled_start):defaultStartDate();
    const end=job.scheduled_end?new Date(job.scheduled_end):new Date(start.getTime()+60*60*1000);
    const assigned=new Set(ctx.assignments.filter(a=>a.job_id===job.id).map(a=>a.member_id));
    const overlay=document.createElement('div');overlay.className='tos-schedule-sheet';
    overlay.innerHTML=`<div class="tos-schedule-panel"><div class="tos-sheet-handle"></div><h3>${job.scheduled_start?'Edit scheduled job':'Schedule job'}</h3><p class="sub">${esc(job.title)}${job.address?` · ${esc(job.address)}`:''}</p><div class="tos-schedule-form"><div class="tos-schedule-field full"><label>Date</label><input id="tos-job-date" type="date" value="${localIso(start)}"></div><div class="tos-schedule-field"><label>Start time</label><input id="tos-job-start" type="time" value="${localTime(start)}"></div><div class="tos-schedule-field"><label>Finish time</label><input id="tos-job-end" type="time" value="${localTime(end)}"></div><div class="tos-schedule-field full"><p class="sub">To change the job stage, open the job from Jobs.</p></div><div class="tos-schedule-field full"><label>Assign team</label><div class="tos-member-picks">${ctx.members.map(m=>`<label class="tos-member-pick"><input type="checkbox" value="${esc(m.id)}" data-member-pick ${assigned.has(m.id)?'checked':''}><span>${esc(m.full_name||'Unnamed')} · ${esc(m.role)}</span></label>`).join('')}</div></div></div><div id="tos-clash-box"></div><div class="tos-sheet-actions"><button class="tos-sheet-cancel" id="tos-schedule-cancel">Cancel</button><button class="tos-sheet-save" id="tos-schedule-save">Save schedule</button></div>${job.scheduled_start?'<button class="tos-sheet-cancel" id="tos-unschedule-job" style="width:100%;margin-top:9px">Remove from diary</button>':''}</div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)close()});overlay.querySelector('#tos-schedule-cancel')?.addEventListener('click',close);overlay.querySelector('#tos-schedule-save')?.addEventListener('click',()=>saveSchedule(job,overlay));overlay.querySelector('#tos-unschedule-job')?.addEventListener('click',()=>unscheduleJob(job,overlay));
  }

  async function saveSchedule(job,overlay){
    const button=overlay.querySelector('#tos-schedule-save');
    const date=overlay.querySelector('#tos-job-date')?.value,startTime=overlay.querySelector('#tos-job-start')?.value,endTime=overlay.querySelector('#tos-job-end')?.value;
    const memberIds=[...overlay.querySelectorAll('[data-member-pick]:checked')].map(x=>x.value);
    const clashBox=overlay.querySelector('#tos-clash-box');
    if(!date||!startTime||!endTime)return showSheetError(clashBox,'Choose a date, start time and finish time.');
    const start=localDateTime(date,startTime),end=localDateTime(date,endTime);
    if(end<=start)return showSheetError(clashBox,'Finish time must be after start time.');
    const conflicts=findConflicts(job.id,start,end,memberIds);
    if(conflicts.length&&button.dataset.confirmClash!=='1'){
      clashBox.innerHTML=`<div class="tos-clash"><strong>Schedule clash found</strong><br>${conflicts.map(c=>`${esc(c.person)} is already on ${esc(c.job.title)} ${esc(timeRange(c.job))}`).join('<br>')}<br><br>Tap <strong>Save anyway</strong> if this is intentional.</div>`;
      button.dataset.confirmClash='1';button.textContent='Save anyway';return;
    }
    try{
      button.disabled=true;button.textContent='Saving…';
      const update=await client.from('jobs').update({scheduled_start:start.toISOString(),scheduled_end:end.toISOString()}).eq('company_id',ctx.companyId).eq('id',job.id);
      if(update.error)throw update.error;
      const del=await client.from('job_assignments').delete().eq('company_id',ctx.companyId).eq('job_id',job.id);if(del.error)throw del.error;
      if(memberIds.length){const rows=memberIds.map(member_id=>({company_id:ctx.companyId,job_id:job.id,member_id}));const ins=await client.from('job_assignments').insert(rows);if(ins.error)throw ins.error;}
      overlay.remove();toast('Schedule saved');await renderSchedule();
    }catch(err){button.disabled=false;button.textContent='Save schedule';button.dataset.confirmClash='';showSheetError(clashBox,err?.message||'Could not save the schedule.');}
  }

  async function unscheduleJob(job,overlay){
    const button=overlay.querySelector('#tos-unschedule-job');
    const box=overlay.querySelector('#tos-clash-box');
    try{button.disabled=true;button.textContent='Removing…';const r=await client.from('jobs').update({scheduled_start:null,scheduled_end:null}).eq('company_id',ctx.companyId).eq('id',job.id);if(r.error)throw r.error;overlay.remove();toast('Job removed from diary');await renderSchedule();}catch(err){button.disabled=false;button.textContent='Remove from diary';showSheetError(box,err?.message||'Could not remove the job.');}
  }

  function findConflicts(jobId,start,end,memberIds){
    const out=[];
    for(const memberId of memberIds){
      const jobIds=new Set(ctx.assignments.filter(a=>a.member_id===memberId&&a.job_id!==jobId).map(a=>a.job_id));
      for(const other of ctx.jobs){if(!jobIds.has(other.id)||!other.scheduled_start||!other.scheduled_end)continue;const s=new Date(other.scheduled_start),e=new Date(other.scheduled_end);if(start<e&&end>s){const p=ctx.members.find(m=>m.id===memberId);out.push({person:p?.full_name||'Team member',job:other});}}
    }
    return out;
  }

  function findAllClashes(jobs,assignments){
    const out=[];const seen=new Set();
    for(const m of ctx.members){const ids=assignments.filter(a=>a.member_id===m.id).map(a=>a.job_id);const list=jobs.filter(j=>ids.includes(j.id)&&j.scheduled_start&&j.scheduled_end).sort(byStart);for(let i=0;i<list.length;i++)for(let k=i+1;k<list.length;k++){const a=list[i],b=list[k];if(new Date(b.scheduled_start)>=new Date(a.scheduled_end))break;if(new Date(a.scheduled_start)<new Date(b.scheduled_end)&&new Date(b.scheduled_start)<new Date(a.scheduled_end)){const key=[m.id,a.id,b.id].join(':');if(!seen.has(key)){seen.add(key);out.push({member:m,a,b});}}}}
    return out;
  }

  function jobPeople(jobId){const ids=ctx.assignments.filter(a=>a.job_id===jobId).map(a=>a.member_id);return ctx.members.filter(m=>ids.includes(m.id));}
  function defaultStartDate(){const now=new Date();const week=daysOfWeek(weekStart);const inCurrent=week.some(d=>localIso(d)===localIso(now));const d=inCurrent?now:week[0];const start=new Date(d);start.setHours(8,0,0,0);return start;}
  function showSheetError(el,text){if(el)el.innerHTML=`<div class="tos-clash">${esc(text)}</div>`;}
  function scheduleStat(label,value){return `<div class="tos-schedule-stat"><small>${esc(label)}</small><strong>${esc(String(value))}</strong></div>`;}
  function byStart(a,b){return new Date(a.scheduled_start)-new Date(b.scheduled_start);}
  function jobHours(j){if(!j.scheduled_start||!j.scheduled_end)return 0;return Math.max(0,(new Date(j.scheduled_end)-new Date(j.scheduled_start))/3600000);}
  function inWeek(value,monday){if(!value)return false;const d=dateIso(value);return d>=monday&&d<=addDaysIso(monday,6);}
  function dateIso(value){return value?localIso(new Date(value)):'';}
  function timeRange(j){if(!j.scheduled_start)return 'Unscheduled';const s=new Date(j.scheduled_start),e=j.scheduled_end?new Date(j.scheduled_end):null;return e?`${localTime(s)}–${localTime(e)}`:localTime(s);}
  function daysOfWeek(iso){const d=parseIso(iso);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x;});}
  function mondayIso(date){const d=new Date(date);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function addDaysIso(iso,days){const d=parseIso(iso);d.setDate(d.getDate()+days);return localIso(d);}
  function parseIso(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0);}
  function localDateTime(date,time){const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);return new Date(y,m-1,d,hh,mm,0,0);}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
  function localTime(date){return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;}
  function weekday(d){return new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(d);}
  function longShort(d){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(d);}
  function fmtDay(d){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(d);}
  function fmtHours(n){const v=Math.round((Number(n)||0)*10)/10;return `${v}h`;}
  function sum(xs){return xs.reduce((a,b)=>a+(Number(b)||0),0);}
  function toast(text){let el=document.querySelector('.tos-schedule-toast');if(!el){el=document.createElement('div');el.className='tos-schedule-toast';document.body.appendChild(el);}el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
