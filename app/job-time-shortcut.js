(()=>{
  if(window.__tradeosJobTimeShortcutV2)return;
  window.__tradeosJobTimeShortcutV2=true;
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!client)return;
  let queued=false,resolving=false;

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  function mount(){
    removeListShortcuts();
    mountJobDetail();
  }

  function removeListShortcuts(){document.querySelectorAll('[data-job-time-shortcut]').forEach(b=>b.remove());}

  async function mountJobDetail(){
    const detail=document.querySelector('.tos-job-detail .tos-job-detail-page');
    if(!detail||detail.querySelector('[data-job-detail-log-time]')||resolving)return;
    resolving=true;
    try{
      const title=detail.querySelector('.tos-job-head-copy h2')?.textContent?.trim()||'Job';
      const job=await resolveJob(detail,title);
      if(!job||!detail.isConnected||detail.querySelector('[data-job-detail-log-time]'))return;
      const hero=detail.querySelector('.tos-job-hero-card');
      if(!hero)return;
      const action=document.createElement('button');
      action.type='button';
      action.className='tos-job-detail-log-time';
      action.dataset.jobDetailLogTime=job.id;
      action.innerHTML='<span aria-hidden="true">+</span><strong>Add time</strong><small>Start a timer or enter hours now</small>';
      action.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTimeForJob(job,title);});
      hero.appendChild(action);

      const timeHead=detail.querySelector('#tos-job-time .tos-job-section-head');
      if(timeHead&&!timeHead.querySelector('[data-job-time-inline]')){
        const inline=document.createElement('button');
        inline.type='button';
        inline.className='tos-job-time-inline';
        inline.dataset.jobTimeInline=job.id;
        inline.textContent='+ Add time';
        inline.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTimeForJob(job,title);});
        timeHead.appendChild(inline);
      }
      ensureStyles();
    }finally{resolving=false;}
  }

  async function resolveJob(detail,title){
    const matching=[...document.querySelectorAll('.job-detail-list-card[data-job-id]')].find(card=>card.querySelector('.item-main > strong')?.textContent?.trim()===title);
    if(matching?.dataset.jobId){
      const r=await client.from('jobs').select('id,company_id,title,address').eq('id',matching.dataset.jobId).maybeSingle();
      if(!r.error&&r.data)return r.data;
    }
    const address=detail.querySelector('.tos-job-address')?.textContent?.trim()||'';
    const r=await client.from('jobs').select('id,company_id,title,address,created_at').eq('title',title).order('created_at',{ascending:false}).limit(20);
    if(r.error)return null;
    const rows=r.data||[];
    return rows.find(j=>address&&j.address&&j.address.trim()===address)||rows[0]||null;
  }

  async function openTimeForJob(job,title){
    document.querySelector('.tos-job-time-sheet')?.remove();
    const overlay=document.createElement('div');
    overlay.className='tos-job-time-sheet';
    overlay.innerHTML=`<div class="tos-job-time-panel" role="dialog" aria-modal="true" aria-label="Add time to ${esc(title)}"><div class="tos-job-time-handle"></div><div class="tos-job-time-head"><div><p>ADD TIME</p><h3>${esc(title)}</h3><small>Log it here without leaving the job.</small></div><button type="button" class="tos-job-time-close" aria-label="Close">×</button></div><div class="tos-job-time-loading">Checking timer…</div></div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('.tos-job-time-close')?.addEventListener('click',close);
    try{
      const running=await getRunningTimer();
      if(!overlay.isConnected)return;
      renderChoice(overlay,job,title,running);
    }catch(err){
      const panel=overlay.querySelector('.tos-job-time-panel');
      if(panel)panel.innerHTML=`<div class="tos-job-time-handle"></div><div class="tos-job-time-head"><div><p>ADD TIME</p><h3>${esc(title)}</h3></div><button type="button" class="tos-job-time-close" aria-label="Close">×</button></div><div class="tos-job-time-error">${esc(friendlyError(err))}</div>`;
      overlay.querySelector('.tos-job-time-close')?.addEventListener('click',close);
    }
  }

  async function getRunningTimer(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError)throw userError;
    if(!user)return null;
    const {data,error}=await client.from('job_timer_sessions').select('id,company_id,job_id,week_start,work_date,started_at,start_time,status').eq('user_id',user.id).eq('status','running').order('started_at',{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;
    return data||null;
  }

  function renderChoice(overlay,job,title,running){
    const panel=overlay.querySelector('.tos-job-time-panel');
    if(!panel)return;
    const same=running?.job_id===job.id;
    panel.innerHTML=`<div class="tos-job-time-handle"></div><div class="tos-job-time-head"><div><p>ADD TIME</p><h3>${esc(title)}</h3><small>${running?(same?'A timer is already running on this job.':'A timer is running on another job.'):'Choose how you want to log the work.'}</small></div><button type="button" class="tos-job-time-close" aria-label="Close">×</button></div><div class="tos-job-time-options">${!running?'<button type="button" class="tos-job-time-option" data-job-start-timer><span>▶</span><div><strong>Start timer</strong><small>Clock the job live from now</small></div><b>›</b></button>':same?'<button type="button" class="tos-job-time-option active" data-job-stop-timer><span>■</span><div><strong>Stop running timer</strong><small>Finish and save this job time</small></div><b>›</b></button>':'<div class="tos-job-time-notice">Timer already running on another job. Stop it before starting a new one.</div>'}<button type="button" class="tos-job-time-option" data-job-manual-time><span>＋</span><div><strong>Add manually</strong><small>Date, start, finish, break and notes</small></div><b>›</b></button></div><button type="button" class="tos-job-time-timesheets" data-job-open-timesheets>Open full timesheet</button>`;
    overlay.querySelector('.tos-job-time-close')?.addEventListener('click',()=>overlay.remove());
    overlay.querySelector('[data-job-start-timer]')?.addEventListener('click',e=>startTimer(job,title,overlay,e.currentTarget));
    overlay.querySelector('[data-job-stop-timer]')?.addEventListener('click',()=>renderStop(overlay,job,title,running));
    overlay.querySelector('[data-job-manual-time]')?.addEventListener('click',()=>renderManual(overlay,job,title));
    overlay.querySelector('[data-job-open-timesheets]')?.addEventListener('click',()=>openTimesheets(job.id,title,overlay));
  }

  async function startTimer(job,title,overlay,btn){
    const now=new Date();
    try{
      btn.disabled=true;btn.querySelector('strong').textContent='Starting…';
      const {data,error}=await client.rpc('start_job_timer',{target_company:job.company_id,target_job:job.id,target_week_start:mondayIso(now),work_day:localIso(now),start_local:localTime(now)});
      if(error)throw error;
      if(!data)throw new Error('Timer did not start. Please try again.');
      overlay.remove();
      showToast(`Timer started for ${title}`);
      schedule();
    }catch(err){
      btn.disabled=false;btn.querySelector('strong').textContent='Start timer';showPanelError(overlay,friendlyError(err));
    }
  }

  function renderStop(overlay,job,title,running){
    const panel=overlay.querySelector('.tos-job-time-panel');
    if(!panel)return;
    panel.innerHTML=`<div class="tos-job-time-handle"></div><div class="tos-job-time-head"><div><p>STOP TIMER</p><h3>${esc(title)}</h3><small>Started ${esc(trimTime(running.start_time))}</small></div><button type="button" class="tos-job-time-close" aria-label="Close">×</button></div><label class="tos-job-time-field"><span>Break</span><select data-job-stop-break><option value="0">No break</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></label><div class="tos-job-time-error" data-job-time-error hidden></div><button type="button" class="tos-job-time-save" data-job-stop-save>Stop & save time</button>`;
    overlay.querySelector('.tos-job-time-close')?.addEventListener('click',()=>overlay.remove());
    overlay.querySelector('[data-job-stop-save]')?.addEventListener('click',async e=>{
      const btn=e.currentTarget,breakMins=Number(overlay.querySelector('[data-job-stop-break]')?.value||0);
      try{
        btn.disabled=true;btn.textContent='Saving…';
        const {error}=await client.rpc('stop_job_timer',{target_timer:running.id,end_local:localTime(new Date()),break_mins:breakMins});
        if(error)throw error;
        overlay.remove();showToast('Time saved');refreshJob(job.id);
      }catch(err){btn.disabled=false;btn.textContent='Stop & save time';showPanelError(overlay,friendlyError(err));}
    });
  }

  function renderManual(overlay,job,title){
    const panel=overlay.querySelector('.tos-job-time-panel');
    if(!panel)return;
    const now=new Date();
    const end=localTime(now);const startDate=new Date(now.getTime()-60*60*1000);const start=localTime(startDate);
    panel.innerHTML=`<div class="tos-job-time-handle"></div><div class="tos-job-time-head"><div><p>ADD MANUALLY</p><h3>${esc(title)}</h3><small>This saves directly against the job and your weekly timesheet.</small></div><button type="button" class="tos-job-time-close" aria-label="Close">×</button></div><form class="tos-job-time-form"><label class="tos-job-time-field"><span>Date</span><input type="date" name="date" value="${localIso(now)}" required></label><div class="tos-job-time-grid"><label class="tos-job-time-field"><span>Start</span><input type="time" name="start" value="${start}" required></label><label class="tos-job-time-field"><span>Finish</span><input type="time" name="end" value="${end}" required></label></div><label class="tos-job-time-field"><span>Break</span><select name="break"><option value="0">No break</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></label><label class="tos-job-time-field"><span>Notes <small>optional</small></span><textarea name="notes" rows="2" placeholder="e.g. First fix kitchen"></textarea></label><div class="tos-job-time-error" data-job-time-error hidden></div><button type="submit" class="tos-job-time-save">Add time</button></form>`;
    overlay.querySelector('.tos-job-time-close')?.addEventListener('click',()=>overlay.remove());
    overlay.querySelector('.tos-job-time-form')?.addEventListener('submit',async e=>{
      e.preventDefault();
      const form=e.currentTarget,fd=new FormData(form),btn=form.querySelector('.tos-job-time-save');
      const date=String(fd.get('date')||''),startAt=String(fd.get('start')||''),endAt=String(fd.get('end')||''),breakMins=Number(fd.get('break')||0),notes=String(fd.get('notes')||'').trim();
      if(!date||!startAt||!endAt){showPanelError(overlay,'Choose the date, start and finish time.');return;}
      try{
        btn.disabled=true;btn.textContent='Adding…';
        const {error}=await client.rpc('create_weekly_time_entry_clock',{target_company:job.company_id,target_week_start:mondayIso(fromIso(date)),target_job:job.id,work_day:date,start_at:startAt,end_at:endAt,break_mins:breakMins,entry_notes:notes||null});
        if(error)throw error;
        overlay.remove();showToast('Time added to job');refreshJob(job.id);
      }catch(err){btn.disabled=false;btn.textContent='Add time';showPanelError(overlay,friendlyError(err));}
    });
  }

  function openTimesheets(jobId,title,overlay){
    const payload={jobId,title:title||'Job',requestedAt:Date.now()};
    try{sessionStorage.setItem('tradeos:pending-job-time',JSON.stringify(payload));}catch(_){ }
    overlay?.remove();
    document.querySelector('.tos-job-detail')?.remove();document.querySelector('.tos-job-team-sheet')?.remove();document.body.classList.remove('tos-job-detail-open','tos-job-team-open');
    const nav=document.querySelector('[data-nav="timesheets"]');
    if(nav){nav.click();continuePendingTimeEntry();}else showToast('Open Timesheets to manage this entry.');
  }

  function pending(){
    try{const raw=sessionStorage.getItem('tradeos:pending-job-time');if(!raw)return null;const value=JSON.parse(raw);if(!value?.jobId)return null;if(Date.now()-Number(value.requestedAt||0)>120000){sessionStorage.removeItem('tradeos:pending-job-time');return null;}return value;}catch(_){return null;}
  }
  function continuePendingTimeEntry(){
    const request=pending();if(!request)return;
    const active=document.querySelector('[data-nav="timesheets"].active'),shell=document.querySelector('.tos-ts');if(!active||!shell){setTimeout(continuePendingTimeEntry,120);return;}
    const today=localIso(new Date()),todayButton=shell.querySelector(`[data-tos-date="${cssEsc(today)}"]`);if(todayButton&&!todayButton.classList.contains('active')){todayButton.click();setTimeout(continuePendingTimeEntry,80);return;}
    let sheet=document.querySelector('.tos-sheet');if(!sheet){const add=shell.querySelector('#tos-add');if(!add)return;if(add.disabled){clearPending();showToast('This week is approved. Reopen it before adding time.');return;}add.click();setTimeout(continuePendingTimeEntry,80);return;}
    if(sheet.dataset.jobShortcutHandled==='1')return;const select=sheet.querySelector('select[name="job"]');if(!select)return;const option=[...select.options].find(o=>o.value===request.jobId);if(!option){clearPending();showToast(`${request.title||'This job'} is not available on your timesheet.`);return;}select.value=request.jobId;select.dispatchEvent(new Event('change',{bubbles:true}));sheet.dataset.jobShortcutHandled='1';clearPending();
  }
  function clearPending(){try{sessionStorage.removeItem('tradeos:pending-job-time');}catch(_){ }}

  function refreshJob(jobId){
    const card=[...document.querySelectorAll('.job-detail-list-card[data-job-id]')].find(x=>x.dataset.jobId===jobId);
    if(!card){schedule();return;}
    document.querySelector('.tos-job-detail')?.remove();document.body.classList.remove('tos-job-detail-open');
    setTimeout(()=>card.click(),120);
  }

  function showPanelError(overlay,text){const box=overlay?.querySelector('[data-job-time-error]')||overlay?.querySelector('.tos-job-time-error');if(box){box.textContent=text;box.hidden=false;}else showToast(text);}
  function showToast(text){document.querySelector('.tos-job-time-toast')?.remove();const toast=document.createElement('div');toast.className='tos-job-time-toast';toast.textContent=text;document.body.appendChild(toast);setTimeout(()=>toast.remove(),2600);}
  function friendlyError(err){const msg=String(err?.message||'Could not save time.');if(/already running/i.test(msg))return'A timer is already running.';if(/overlaps|covering this start time/i.test(msg))return'You already have time logged over that period.';if(/finalised|approved/i.test(msg))return'This week is finalised. Reopen it before adding time.';return msg;}
  function ensureStyles(){
    if(document.querySelector('#tos-job-time-v2-style'))return;
    const s=document.createElement('style');s.id='tos-job-time-v2-style';s.textContent=`.tos-job-time-inline{margin-left:auto;min-height:36px;padding:0 12px;border:0;border-radius:11px;background:#eef4ff;color:#2457d6;font:850 12px system-ui}.tos-job-time-sheet{position:fixed;inset:0;z-index:100000;background:rgba(11,18,32,.48);display:flex;align-items:flex-end;justify-content:center}.tos-job-time-panel{width:min(100%,560px);max-height:88vh;overflow:auto;background:#fff;border-radius:24px 24px 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -20px 50px rgba(11,18,32,.2)}.tos-job-time-handle{width:42px;height:5px;border-radius:99px;background:#d9dfeb;margin:0 auto 14px}.tos-job-time-head{display:flex;gap:14px;align-items:flex-start;justify-content:space-between}.tos-job-time-head p{margin:0 0 4px;color:#6b7280;font:850 11px system-ui;letter-spacing:.12em}.tos-job-time-head h3{margin:0;font:900 22px system-ui;color:#0b1220}.tos-job-time-head small{display:block;margin-top:4px;color:#6b7280;font:650 12px/1.4 system-ui}.tos-job-time-close{border:0;background:#f1f5f9;width:38px;height:38px;border-radius:12px;font-size:24px}.tos-job-time-options{display:grid;gap:10px;margin-top:18px}.tos-job-time-option{width:100%;display:grid;grid-template-columns:38px 1fr 16px;gap:10px;align-items:center;text-align:left;padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;color:#0b1220}.tos-job-time-option>span{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#eef4ff;color:#2457d6;font-size:18px}.tos-job-time-option strong{display:block;font:850 14px system-ui}.tos-job-time-option small{display:block;margin-top:3px;color:#6b7280;font:650 11px system-ui}.tos-job-time-option.active{border-color:#b7c9ff;background:#f7f9ff}.tos-job-time-timesheets{width:100%;margin-top:12px;border:0;background:transparent;color:#526070;font:800 12px system-ui;padding:10px}.tos-job-time-notice,.tos-job-time-error,.tos-job-time-loading{margin-top:16px;padding:12px 14px;border-radius:12px;background:#f8fafc;color:#526070;font:700 12px/1.45 system-ui}.tos-job-time-error{background:#fff1f2;color:#9f1239}.tos-job-time-field{display:grid;gap:7px;margin-top:14px}.tos-job-time-field>span{font:800 12px system-ui;color:#334155}.tos-job-time-field input,.tos-job-time-field select,.tos-job-time-field textarea{width:100%;box-sizing:border-box;border:1px solid #d8dee8;border-radius:12px;background:#fff;padding:12px;font:700 15px system-ui;color:#0b1220}.tos-job-time-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tos-job-time-save{width:100%;min-height:50px;margin-top:18px;border:0;border-radius:14px;background:#2f6bff;color:#fff;font:900 14px system-ui}.tos-job-time-save:disabled{opacity:.55}.tos-job-time-toast{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100001;max-width:min(86vw,420px);padding:11px 14px;border-radius:13px;background:#0b1220;color:#fff;box-shadow:0 12px 30px rgba(11,18,32,.24);font:800 12px/1.35 system-ui;text-align:center}`;document.head.appendChild(s);
  }
  function localIso(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return`${y}-${m}-${day}`;}
  function localTime(d){return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
  function mondayIso(date){const d=new Date(date);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function fromIso(v){const [y,m,d]=String(v).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0);}
  function trimTime(v){return String(v||'').slice(0,5);}
  function cssEsc(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  new MutationObserver(mutations=>{if(mutations.some(m=>m.type!=='attributes'||m.oldValue!==m.target.getAttribute(m.attributeName)))schedule();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class','data-job-id']});
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  ensureStyles();schedule();
})();