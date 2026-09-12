(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false,busy=false,contextCache=null,jobsCache=[];
  let current=null;
  const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  const dateFmt=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}

  async function getContext(){
    const {data:{user}}=await client.auth.getUser();
    if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      membership=r.data;
    }
    if(!membership){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      membership=r.data; companyId=membership?.company_id||null;
    }
    if(!membership||!companyId)return null;
    return {companyId,membership,user};
  }

  async function mount(){
    const list=document.querySelector('.jobs-list-clean');
    if(!list||busy)return;
    busy=true;
    try{
      const ctx=await getContext();
      if(!ctx)return;
      if(!contextCache||contextCache.companyId!==ctx.companyId){contextCache=ctx;jobsCache=[];}
      if(!jobsCache.length){
        const jr=await client.from('jobs').select('id,company_id,title,status,address,agreed_value,created_at').eq('company_id',ctx.companyId).order('created_at',{ascending:false}).limit(300);
        if(jr.error)return;
        jobsCache=jr.data||[];
      }
      const cards=[...list.querySelectorAll('.item')];
      cards.forEach(card=>enhanceCard(card));
      const p=list.querySelector(':scope > .section-head p');
      if(p)p.textContent='Tap a job to open its people, time and details.';
    }finally{busy=false;}
  }

  function enhanceCard(card){
    if(card.dataset.jobDetailMounted==='1')return;
    let jobId=card.querySelector('[data-assign-sel]')?.dataset.assignSel||null;
    let job=jobId?jobsCache.find(j=>j.id===jobId):null;
    if(!job){
      const title=card.querySelector('.item-main > strong')?.textContent?.trim();
      const address=card.querySelector('.item-main > small')?.textContent?.trim();
      job=jobsCache.find(j=>j.title===title && (!address||!j.address||address===j.address))||jobsCache.find(j=>j.title===title);
      jobId=job?.id||null;
    }
    if(!jobId)return;
    card.dataset.jobDetailMounted='1';
    card.dataset.jobId=jobId;
    card.classList.add('job-detail-list-card');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',`Open ${job?.title||'job'}`);
    card.querySelectorAll('.toolbar,.assigns,.job-team-row').forEach(x=>x.style.display='none');
    if(!card.querySelector('.job-detail-chevron')){
      const ch=document.createElement('span');ch.className='job-detail-chevron';ch.setAttribute('aria-hidden','true');ch.textContent='›';card.appendChild(ch);
    }
    const open=()=>openJob(jobId);
    card.addEventListener('click',e=>{if(e.target.closest('button,select,input,a'))return;open();});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  }

  async function openJob(jobId){
    closeJob();
    const o=document.createElement('div');
    o.className='tos-job-detail';
    o.innerHTML=`<div class="tos-job-detail-page"><div class="tos-job-detail-loading"><div class="tos-job-spinner"></div><strong>Opening job…</strong></div></div>`;
    document.body.appendChild(o);document.body.classList.add('tos-job-detail-open');
    try{
      await loadJob(jobId,o);
    }catch(e){
      o.querySelector('.tos-job-detail-page').innerHTML=`<div class="tos-job-error"><button type="button" class="tos-job-back">‹ Back</button><h2>Couldn’t open this job</h2><p>${esc(e?.message||'Please try again.')}</p></div>`;
      o.querySelector('.tos-job-back')?.addEventListener('click',closeJob);
    }
  }

  async function loadJob(jobId,o){
    const ctx=contextCache||await getContext(); if(!ctx)throw new Error('Your session has expired.');
    const [jr,mr,ar,tr]=await Promise.all([
      client.from('jobs').select('id,company_id,customer_id,title,status,address,scheduled_start,scheduled_end,notes,agreed_value,customers(name,email,phone,address)').eq('id',jobId).eq('company_id',ctx.companyId).single(),
      client.from('company_members').select('id,user_id,full_name,role,active').eq('company_id',ctx.companyId).eq('active',true).order('created_at',{ascending:true}),
      client.from('job_assignments').select('id,job_id,member_id').eq('company_id',ctx.companyId).eq('job_id',jobId),
      client.from('weekly_time_entries').select('id,user_id,weekly_timesheet_id,work_date,start_time,end_time,break_minutes,hours,notes,created_at').eq('company_id',ctx.companyId).eq('job_id',jobId).order('work_date',{ascending:false}).order('start_time',{ascending:false}).limit(300)
    ]);
    if(jr.error)throw jr.error;if(mr.error)throw mr.error;if(ar.error)throw ar.error;if(tr.error)throw tr.error;
    current={ctx,job:jr.data,members:mr.data||[],assignments:ar.data||[],entries:tr.data||[],overlay:o};
    renderJob();
  }

  function renderJob(){
    if(!current?.overlay?.isConnected)return;
    const {job,members,assignments,entries,ctx}=current;
    const page=current.overlay.querySelector('.tos-job-detail-page');
    const manager=['owner','admin','manager'].includes(ctx.membership.role);
    const assignedIds=new Set(assignments.map(a=>a.member_id));
    const assigned=members.filter(m=>assignedIds.has(m.id));
    const totalHours=sum(entries.map(e=>num(e.hours)));
    const grouped=groupEntries(entries);
    const customer=job.customers||null;
    page.innerHTML=`
      <header class="tos-job-head">
        <button type="button" class="tos-job-back" aria-label="Back to jobs">‹</button>
        <div class="tos-job-head-copy"><span>JOB</span><h2>${esc(job.title||'Job')}</h2></div>
        <span class="tos-job-status">${esc(job.status||'booked')}</span>
      </header>
      <main class="tos-job-body">
        <section class="tos-job-hero-card">
          <div class="tos-job-address">${esc(job.address||customer?.address||'No address added')}</div>
          <div class="tos-job-metrics">
            <div><span>Value</span><strong>${gbp.format(num(job.agreed_value))}</strong></div>
            <div><span>Total time</span><strong>${hours(totalHours)}</strong></div>
            <div><span>People</span><strong>${assigned.length}</strong></div>
          </div>
          ${job.scheduled_start?`<div class="tos-job-schedule"><span>Scheduled</span><strong>${esc(formatSchedule(job.scheduled_start,job.scheduled_end))}</strong></div>`:''}
          ${job.notes?`<div class="tos-job-notes"><span>Job notes</span><p>${esc(job.notes)}</p></div>`:''}
        </section>

        <section class="tos-job-section" id="tos-job-people">
          <div class="tos-job-section-head"><div><span>TEAM</span><h3>People on this job</h3></div>${manager?'<button type="button" class="tos-job-manage-team">Manage</button>':''}</div>
          <div class="tos-job-people-list">${assigned.length?assigned.map(m=>personRow(m,entries)).join(''):`<div class="tos-job-empty"><strong>No one assigned yet</strong><p>${manager?'Tap Manage to add people to this job.':'No team members are assigned to this job.'}</p></div>`}</div>
        </section>

        <section class="tos-job-section" id="tos-job-time">
          <div class="tos-job-section-head"><div><span>TIME</span><h3>Time entered</h3></div><div class="tos-job-time-total"><strong>${hours(totalHours)}</strong><small>${entries.length} entr${entries.length===1?'y':'ies'}</small></div></div>
          <div class="tos-job-time-list">${entries.length?grouped.map(g=>dayGroup(g,members)).join(''):`<div class="tos-job-empty"><strong>No time entered yet</strong><p>Time logged from Timesheets will appear here against this job.</p></div>`}</div>
        </section>

        ${customer?`<section class="tos-job-section tos-job-customer"><div class="tos-job-section-head"><div><span>CUSTOMER</span><h3>${esc(customer.name||'Customer')}</h3></div></div><div class="tos-job-contact">${customer.email?`<span>${esc(customer.email)}</span>`:''}${customer.phone?`<span>${esc(customer.phone)}</span>`:''}${customer.address?`<span>${esc(customer.address)}</span>`:''}</div></section>`:''}
      </main>`;
    page.querySelector('.tos-job-back')?.addEventListener('click',closeJob);
    page.querySelector('.tos-job-manage-team')?.addEventListener('click',openManageTeam);
  }

  function personRow(m,entries){
    const personHours=sum(entries.filter(e=>e.user_id===m.user_id).map(e=>num(e.hours)));
    return `<div class="tos-job-person"><div class="tos-job-avatar">${initials(m.full_name||m.role)}</div><div><strong>${esc(m.full_name||pretty(m.role))}</strong><span>${esc(pretty(m.role))}</span></div><b>${hours(personHours)}</b></div>`;
  }

  function groupEntries(entries){
    const map=new Map();
    entries.forEach(e=>{if(!map.has(e.work_date))map.set(e.work_date,[]);map.get(e.work_date).push(e);});
    return [...map.entries()].map(([date,items])=>({date,items,total:sum(items.map(x=>num(x.hours)))}));
  }

  function dayGroup(g,members){
    const d=new Date(`${g.date}T12:00:00`);
    return `<div class="tos-job-day"><div class="tos-job-day-head"><strong>${esc(dateFmt.format(d))}</strong><span>${hours(g.total)}</span></div>${g.items.map(e=>entryRow(e,members)).join('')}</div>`;
  }

  function entryRow(e,members){
    const person=members.find(m=>m.user_id===e.user_id);
    const time=e.start_time&&e.end_time?`${hhmm(e.start_time)}–${hhmm(e.end_time)}`:'Time entry';
    const breakText=num(e.break_minutes)>0?` · ${num(e.break_minutes)}m break`:'';
    return `<div class="tos-job-time-entry"><div><strong>${esc(person?.full_name||'Team member')}</strong><span>${esc(time)}${breakText}</span>${e.notes?`<p>${esc(e.notes)}</p>`:''}</div><b>${hours(num(e.hours))}</b></div>`;
  }

  function openManageTeam(){
    if(!current)return;
    document.querySelector('.tos-job-team-sheet')?.remove();
    const {job,members,assignments}=current;
    const selected=new Set(assignments.map(a=>a.member_id));
    const o=document.createElement('div');o.className='tos-job-team-sheet';
    o.innerHTML=`<div class="tos-job-team-panel" role="dialog" aria-modal="true" aria-label="People on ${esc(job.title)}"><div class="tos-job-team-handle"></div><div class="tos-job-team-head"><div><span>PEOPLE ON JOB</span><h3>${esc(job.title)}</h3><p>Choose who can see and log time to this job.</p></div><button type="button" class="tos-job-team-close">×</button></div><div class="tos-job-team-options">${members.map(m=>`<label><input type="checkbox" value="${esc(m.id)}" ${selected.has(m.id)?'checked':''}><i>${initials(m.full_name||m.role)}</i><span><strong>${esc(m.full_name||pretty(m.role))}</strong><small>${esc(pretty(m.role))}</small></span><b></b></label>`).join('')}</div><div class="tos-job-team-error" hidden></div><button type="button" class="tos-job-team-save">Save people on ${esc(job.title)}</button></div>`;
    document.body.appendChild(o);document.body.classList.add('tos-job-team-open');
    const close=()=>{o.remove();document.body.classList.remove('tos-job-team-open');};
    o.querySelector('.tos-job-team-close')?.addEventListener('click',close);o.addEventListener('click',e=>{if(e.target===o)close();});
    o.querySelector('.tos-job-team-save')?.addEventListener('click',async e=>{
      const btn=e.currentTarget,err=o.querySelector('.tos-job-team-error');
      const next=new Set([...o.querySelectorAll('input:checked')].map(x=>x.value));
      const add=[...next].filter(x=>!selected.has(x));const remove=[...selected].filter(x=>!next.has(x));
      btn.disabled=true;btn.textContent='Saving…';err.hidden=true;
      try{
        if(add.length){const r=await client.from('job_assignments').upsert(add.map(member_id=>({company_id:current.ctx.companyId,job_id:job.id,member_id})),{onConflict:'job_id,member_id',ignoreDuplicates:true});if(r.error)throw r.error;}
        if(remove.length){const r=await client.from('job_assignments').delete().eq('company_id',current.ctx.companyId).eq('job_id',job.id).in('member_id',remove);if(r.error)throw r.error;}
        const ar=await client.from('job_assignments').select('id,job_id,member_id').eq('company_id',current.ctx.companyId).eq('job_id',job.id);if(ar.error)throw ar.error;
        current.assignments=ar.data||[];close();renderJob();toast('People updated');
      }catch(x){btn.disabled=false;btn.textContent=`Save people on ${job.title}`;err.textContent=x?.message||'Could not update this job.';err.hidden=false;}
    });
  }

  function closeJob(){document.querySelector('.tos-job-detail')?.remove();document.querySelector('.tos-job-team-sheet')?.remove();document.body.classList.remove('tos-job-detail-open','tos-job-team-open');current=null;}
  function toast(t){document.querySelector('.tos-job-toast')?.remove();const x=document.createElement('div');x.className='tos-job-toast';x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2200);}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function sum(a){return a.reduce((x,y)=>x+num(y),0);}
  function hours(v){const n=num(v);return `${Number.isInteger(n)?n:n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}h`;}
  function hhmm(v){return String(v||'').slice(0,5);}
  function pretty(v){return String(v||'').replace(/(^|[_-])(\w)/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function initials(v){const p=String(v||'?').trim().split(/\s+/).filter(Boolean);return esc((p[0]?.[0]||'?')+(p.length>1?(p[p.length-1]?.[0]||''):''));}
  function formatSchedule(a,b){const start=new Date(a),end=b?new Date(b):null;const df=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});return end?`${df.format(start)} – ${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(end)}`:df.format(start);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.querySelector('.tos-job-team-sheet'))document.querySelector('.tos-job-team-sheet .tos-job-team-close')?.click();else if(document.querySelector('.tos-job-detail'))closeJob();}});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();