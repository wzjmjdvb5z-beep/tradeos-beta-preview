(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let selectedDate=null;
  let scheduled=false;
  let ctx=null;
  const dateFmt=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const shortFmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'});

  function start(){
    if(!client)return;
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    schedule();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(async()=>{scheduled=false;await mount();});
  }
  async function mount(){
    const active=document.querySelector('[data-nav="timesheets"].active');
    const wrap=document.querySelector('main.wrap');
    if(!active||!wrap||wrap.querySelector('.tos-ts'))return;
    const table=wrap.querySelector('.timesheet-wrap table');
    if(!table)return;
    const sourceCard=table.closest('.card.section');
    const oldHero=wrap.querySelector(':scope > .hero');
    if(!sourceCard)return;
    const inputs=[...table.querySelectorAll('[data-hour-job][data-hour-date]')];
    if(!inputs.length)return;
    sourceCard.classList.add('tos-source-hidden');
    oldHero?.classList.add('tos-source-hidden');
    const shell=document.createElement('section');
    shell.className='tos-ts';
    shell.innerHTML='<div class="tos-loading">Loading timesheet…</div>';
    wrap.insertBefore(shell,oldHero||sourceCard);
    try{
      ctx=await loadContext(sourceCard,table,inputs);
      render(shell);
    }catch(err){
      shell.innerHTML=`<div class="tos-lock-note">${esc(err?.message||'Could not load the timesheet.')}</div>`;
    }
  }

  async function loadContext(sourceCard,table,inputs){
    const dayOrder=[];const seen=new Set();
    for(const input of inputs){const d=input.dataset.hourDate;if(d&&!seen.has(d)){seen.add(d);dayOrder.push(d)}}
    const rows=[...table.querySelectorAll('tbody tr')].map(row=>{
      const first=row.querySelector('[data-hour-job]');
      if(!first)return null;
      return {id:first.dataset.hourJob,title:row.querySelector('.job-col strong')?.textContent?.trim()||'Job'};
    }).filter(Boolean);
    const jobs=[...new Map(rows.map(r=>[r.id,r])).values()];
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)throw new Error('Please sign in again.');
    if(!jobs.length)throw new Error('No jobs are available for this timesheet.');
    const {data:job,error:jobError}=await client.from('jobs').select('company_id').eq('id',jobs[0].id).single();
    if(jobError)throw jobError;
    const companyId=job.company_id;
    const {data:membership}=await client.from('company_members').select('role,full_name').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
    const role=membership?.role||'employee';
    const manager=['owner','admin','manager'].includes(role);
    const weekStart=dayOrder[0];
    const state={sourceCard,table,dayOrder,jobs,user,companyId,role,manager,weekStart,person:membership?.full_name||sourceCard.querySelector('.weekbar strong')?.textContent?.trim()||'My timesheet',sheet:null,entries:[]};
    await reloadData(state);
    const today=localIso(new Date());
    if(!selectedDate||!dayOrder.includes(selectedDate))selectedDate=dayOrder.includes(today)?today:dayOrder[0];
    return state;
  }

  async function reloadData(state=ctx){
    if(!state)return;
    const last=state.dayOrder[state.dayOrder.length-1];
    const [sheetResult,entriesResult]=await Promise.all([
      client.from('weekly_timesheets').select('id,status,week_start,submitted_at,reviewed_at,rejection_reason').eq('company_id',state.companyId).eq('user_id',state.user.id).eq('week_start',state.weekStart).maybeSingle(),
      client.from('weekly_time_entries').select('id,weekly_timesheet_id,company_id,user_id,job_id,work_date,hours,notes,start_time,end_time,break_minutes,created_at,updated_at').eq('company_id',state.companyId).eq('user_id',state.user.id).gte('work_date',state.weekStart).lte('work_date',last).order('work_date',{ascending:true}).order('start_time',{ascending:true})
    ]);
    if(sheetResult.error)throw sheetResult.error;
    if(entriesResult.error)throw entriesResult.error;
    state.sheet=sheetResult.data||null;
    state.entries=entriesResult.data||[];
  }

  function render(shell=document.querySelector('.tos-ts')){
    if(!shell||!ctx)return;
    const today=localIso(new Date());
    const status=ctx.sheet?.status||'draft';
    const locked=['submitted','approved'].includes(status.toLowerCase());
    const entries=ctx.entries.slice().sort(sortEntries);
    const dayTotals=Object.fromEntries(ctx.dayOrder.map(d=>[d,sum(entries.filter(e=>e.work_date===d).map(e=>e.hours))]));
    const total=sum(Object.values(dayTotals));
    const selectedEntries=entries.filter(e=>e.work_date===selectedDate);
    const jobsUsed=new Set(entries.map(e=>e.job_id)).size;
    const weekLabel=`${shortFmt.format(toDate(ctx.dayOrder[0]))} – ${shortFmt.format(toDate(ctx.dayOrder[6]))}`;
    shell.innerHTML=`
      <div class="tos-ts-hero"><div><p class="eyebrow">TIMESHEETS</p><h2>Log time. Done.</h2><p>Each visit or task can have its own start and finish time.</p></div><span class="tos-status ${esc(status.toLowerCase())}">${esc(status)}</span></div>
      <div class="tos-week-card">
        <div class="tos-week-head">
          <div class="tos-week-person"><strong>${esc(ctx.person)}</strong><small>${total?`${fmtHours(total)} hours this week`:'No time entered yet'}</small></div>
          <div class="tos-week-nav"><button class="tos-icon-btn" id="tos-prev" aria-label="Previous week">‹</button><span class="tos-week-label">${esc(weekLabel)}</span><button class="tos-icon-btn" id="tos-next" aria-label="Next week">›</button></div>
        </div>
        <div class="tos-days">${ctx.dayOrder.map(d=>dayButton(d,dayTotals[d],d===selectedDate,d===today)).join('')}</div>
      </div>
      <div class="tos-day-section">
        <div class="tos-day-title"><div><h3>${esc(dateFmt.format(toDate(selectedDate)))}</h3><small>${fmtHours(dayTotals[selectedDate]||0)} hours · ${selectedEntries.length} ${selectedEntries.length===1?'entry':'entries'}</small></div><button class="tos-add-btn" id="tos-add" ${locked?'disabled':''}>+ Add time</button></div>
        ${locked?`<div class="tos-lock-note">This week is <strong>${esc(status)}</strong>. ${ctx.manager?'Reopen it to correct or add time.':'Ask a manager to reopen it if a correction is needed.'}${ctx.manager&&ctx.sheet?.id?` <button class="tos-inline-action" id="tos-reopen">Reopen week</button>`:''}</div>`:''}
        <div class="tos-entry-list">${selectedEntries.length?selectedEntries.map(entryCard).join(''):`<div class="tos-empty">No time entered for this day.<br>${locked?'':'Tap <strong>+ Add time</strong> to add the first block.'}</div>`}</div>
      </div>
      <div class="tos-summary">
        <div class="tos-summary-card"><small>Week total</small><strong>${fmtHours(total)}h</strong></div>
        <div class="tos-summary-card"><small>Selected day</small><strong>${fmtHours(dayTotals[selectedDate]||0)}h</strong></div>
        <div class="tos-summary-card"><small>Jobs used</small><strong>${jobsUsed}</strong></div>
      </div>
      ${locked?'':`<button class="tos-submit" id="tos-submit" ${total<=0||!ctx.sheet?.id?'disabled':''}>Submit week</button>`}
    `;
    shell.querySelectorAll('[data-tos-date]').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.tosDate;render(shell)}));
    shell.querySelector('#tos-prev')?.addEventListener('click',()=>ctx.sourceCard.querySelector('#prev')?.click());
    shell.querySelector('#tos-next')?.addEventListener('click',()=>ctx.sourceCard.querySelector('#next')?.click());
    shell.querySelector('#tos-add')?.addEventListener('click',()=>openEditor(null));
    shell.querySelectorAll('[data-entry-id]').forEach(b=>b.addEventListener('click',()=>{
      const entry=ctx.entries.find(e=>e.id===b.dataset.entryId);
      if(entry&&!locked)openEditor(entry);
    }));
    shell.querySelector('#tos-submit')?.addEventListener('click',submitWeek);
    shell.querySelector('#tos-reopen')?.addEventListener('click',reopenWeek);
  }

  function dayButton(isoDate,hours,active,today){
    const d=toDate(isoDate);const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return `<button class="tos-day ${active?'active':''} ${today?'today':''}" data-tos-date="${isoDate}"><span class="dow">${dow}</span><span class="date">${d.getDate()}</span><span class="hours">${hours>0?`${fmtHours(hours)}h`:'–'}</span></button>`;
  }

  function entryCard(e){
    const job=ctx.jobs.find(j=>j.id===e.job_id);
    const br=Number(e.break_minutes)||0;
    const span=e.start_time&&e.end_time?`${trimTime(e.start_time)}–${trimTime(e.end_time)}`:fmtDuration(e.hours);
    const detail=e.start_time&&e.end_time?(br?`${span} · ${br} min break`:span):span;
    return `<div class="tos-entry-card"><div class="tos-entry-main"><strong>${esc(job?.title||'Job')}</strong><small>${esc(detail)}</small>${e.notes?`<span class="tos-entry-note">${esc(e.notes)}</span>`:''}</div><div class="tos-entry-side"><span class="tos-entry-hours">${fmtHours(e.hours)}h</span><button class="tos-edit-btn" data-entry-id="${esc(e.id)}">Edit</button></div></div>`;
  }

  function openEditor(entry){
    document.querySelector('.tos-sheet')?.remove();
    const dayEntries=ctx.entries.filter(e=>e.work_date===selectedDate).sort(sortEntries);
    let start=entry?.start_time?trimTime(entry.start_time):suggestStart(dayEntries);
    let end=entry?.end_time?trimTime(entry.end_time):suggestEnd(start,dayEntries.length===0);
    const br=entry?.break_minutes||0;
    const panel=document.createElement('div');panel.className='tos-sheet';
    panel.innerHTML=`<div class="tos-sheet-panel" role="dialog" aria-modal="true"><div class="tos-sheet-handle"></div><div class="tos-sheet-head"><div><p class="eyebrow">${entry?'EDIT TIME':'ADD TIME'}</p><h3>${esc(dateFmt.format(toDate(selectedDate)))}</h3></div><button class="tos-close" aria-label="Close">×</button></div><form class="tos-form" id="tos-block-form">
      <div class="tos-field"><label>Job</label><select name="job">${ctx.jobs.map(j=>`<option value="${esc(j.id)}" ${entry?.job_id===j.id?'selected':''}>${esc(j.title)}</option>`).join('')}</select></div>
      <div class="tos-clock-grid"><div class="tos-field"><label>Start time</label><input type="time" name="startTime" value="${esc(start)}" required></div><div class="tos-field"><label>Finish time</label><input type="time" name="endTime" value="${esc(end)}" required></div></div>
      <div class="tos-field"><label>Break</label><select name="breakMinutes"><option value="0" ${br===0?'selected':''}>No break</option><option value="15" ${br===15?'selected':''}>15 minutes</option><option value="30" ${br===30?'selected':''}>30 minutes</option><option value="45" ${br===45?'selected':''}>45 minutes</option><option value="60" ${br===60?'selected':''}>1 hour</option><option value="90" ${br===90?'selected':''}>1 hour 30 minutes</option></select></div>
      <div class="tos-field"><label>Task / notes <span class="tos-optional">optional</span></label><textarea name="notes" rows="2" placeholder="e.g. First fix kitchen, fault finding, travel…">${esc(entry?.notes||'')}</textarea></div>
      <div class="tos-clock-total"><span>Recorded time</span><strong id="tos-block-total">—</strong></div>
      <div class="tos-form-error" id="tos-form-error" hidden></div>
      <div class="tos-sheet-actions">${entry?'<button type="button" class="tos-delete" id="tos-delete">Remove</button>':'<button type="button" class="tos-delete tos-cancel-style" id="tos-cancel">Cancel</button>'}<button class="tos-save">${entry?'Save changes':'Add time'}</button></div>
    </form></div>`;
    document.body.appendChild(panel);
    const form=panel.querySelector('#tos-block-form');
    const update=()=>{const h=calculateHours(form.elements.startTime.value,form.elements.endTime.value,Number(form.elements.breakMinutes.value)||0);panel.querySelector('#tos-block-total').textContent=h>0?formatDuration(h):'—'};
    form.elements.startTime.addEventListener('input',update);form.elements.endTime.addEventListener('input',update);form.elements.breakMinutes.addEventListener('change',update);update();
    const close=()=>panel.remove();
    panel.addEventListener('click',e=>{if(e.target===panel)close()});panel.querySelector('.tos-close')?.addEventListener('click',close);panel.querySelector('#tos-cancel')?.addEventListener('click',close);
    panel.querySelector('#tos-delete')?.addEventListener('click',()=>removeEntry(entry,panel));
    form.addEventListener('submit',e=>saveEntry(e,entry,panel));
  }

  async function saveEntry(e,entry,panel){
    e.preventDefault();
    const form=e.currentTarget,save=form.querySelector('.tos-save'),errorBox=form.querySelector('#tos-form-error');
    const jobId=String(form.elements.job.value||''),start=form.elements.startTime.value,end=form.elements.endTime.value,breakMinutes=Number(form.elements.breakMinutes.value)||0,notes=String(form.elements.notes.value||'').trim();
    const hours=calculateHours(start,end,breakMinutes);
    setError(errorBox,'');
    if(!jobId||!start||!end||hours<=0||hours>24){setError(errorBox,'Check the job, start time, finish time and break.');return;}
    try{
      save.disabled=true;save.textContent=entry?'Saving…':'Adding…';
      const rpc=entry
        ? client.rpc('update_weekly_time_entry_clock',{target_entry:entry.id,target_job:jobId,start_at:start,end_at:end,break_mins:breakMinutes,entry_notes:notes||null})
        : client.rpc('create_weekly_time_entry_clock',{target_company:ctx.companyId,target_week_start:ctx.weekStart,target_job:jobId,work_day:selectedDate,start_at:start,end_at:end,break_mins:breakMinutes,entry_notes:notes||null});
      const {error}=await withTimeout(rpc,15000,'Saving took too long. Please try again.');
      if(error)throw error;
      await reloadData();panel.remove();render();
    }catch(err){setError(errorBox,prettyError(err));save.disabled=false;save.textContent=entry?'Save changes':'Add time';}
  }

  async function removeEntry(entry,panel){
    if(!entry)return;
    const btn=panel.querySelector('#tos-delete'),errorBox=panel.querySelector('#tos-form-error');
    try{
      btn.disabled=true;btn.textContent='Removing…';
      const {error}=await client.rpc('delete_weekly_time_entry',{target_entry:entry.id});
      if(error)throw error;
      await reloadData();panel.remove();render();
    }catch(err){setError(errorBox,prettyError(err));btn.disabled=false;btn.textContent='Remove';}
  }

  async function submitWeek(){
    if(!ctx.sheet?.id)return;
    const btn=document.querySelector('#tos-submit');
    try{if(btn){btn.disabled=true;btn.textContent='Submitting…'}const {error}=await client.rpc('submit_weekly_timesheet',{target_weekly_timesheet:ctx.sheet.id});if(error)throw error;await reloadData();render();}catch(err){if(btn){btn.disabled=false;btn.textContent='Submit week'}showToast(prettyError(err),true)}
  }
  async function reopenWeek(){
    if(!ctx.sheet?.id)return;
    const btn=document.querySelector('#tos-reopen');
    try{if(btn){btn.disabled=true;btn.textContent='Reopening…'}const {error}=await client.rpc('reopen_weekly_timesheet',{target_weekly_timesheet:ctx.sheet.id});if(error)throw error;await reloadData();render();showToast('Week reopened');}catch(err){if(btn){btn.disabled=false;btn.textContent='Reopen week'}showToast(prettyError(err),true)}
  }

  function suggestStart(entries){
    const timed=entries.filter(e=>e.end_time).sort(sortEntries);
    return timed.length?trimTime(timed[timed.length-1].end_time):'08:00';
  }
  function suggestEnd(start,first){
    if(first&&start==='08:00')return'17:00';
    return addMinutes(start,60);
  }
  function sortEntries(a,b){return String(a.start_time||'99:99').localeCompare(String(b.start_time||'99:99'))||String(a.created_at||'').localeCompare(String(b.created_at||''));}
  function calculateHours(start,end,breakMinutes){if(!start||!end)return 0;let s=timeToMinutes(start),f=timeToMinutes(end),gross=f-s;if(gross<=0)gross+=1440;const net=gross-(Number(breakMinutes)||0);return net>0?net/60:0;}
  function timeToMinutes(value){const [h,m]=String(value).split(':').map(Number);return h*60+m;}
  function addMinutes(start,mins){const m=(timeToMinutes(start)+mins)%1440;return`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
  function formatDuration(hours){const mins=Math.round(hours*60),h=Math.floor(mins/60),m=mins%60;return h&&m?`${h}h ${m}m`:h?`${h}h`:`${m}m`;}
  function fmtDuration(h){return formatDuration(Number(h)||0)}
  function fmtHours(v){const n=Math.round(num(v)*100)/100;return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
  function sum(a){return a.reduce((x,y)=>x+num(y),0)}
  function trimTime(v){return String(v||'').slice(0,5)}
  function toDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0)}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return`${y}-${m}-${d}`}
  function withTimeout(promise,ms,message){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))])}
  function setError(el,msg){if(!el)return;el.textContent=msg;el.hidden=!msg}
  function prettyError(err){const msg=String(err?.message||'Could not save the time entry.');if(msg.toLowerCase().includes('overlaps'))return'That time overlaps another entry on this day. Adjust the start or finish time.';if(msg.toLowerCase().includes('locked'))return'This week is locked. Reopen the week before making changes.';return msg}
  function showToast(message,isError=false){let el=document.querySelector('.tos-mini-toast');if(!el){el=document.createElement('div');el.className='tos-mini-toast';document.body.appendChild(el)}el.textContent=message;el.classList.toggle('error',isError);el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),2200)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
