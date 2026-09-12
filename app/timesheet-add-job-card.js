(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let queued=false;

  function start(){
    new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
    queue();
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  function enhance(){
    const shell=document.querySelector('.tos-ts');
    const section=shell?.querySelector('.tos-day-section');
    if(!shell||!section)return;

    const original=section.querySelector('#tos-add');
    const list=section.querySelector('.tos-entry-list');
    const timer=shell.querySelector('.tos-live-timer-v2');
    if(!original||!list)return;

    original.classList.add('tos-add-original-hidden');

    const timerRunning=!!timer?.querySelector('#tos-stop-live');
    if(timer)timer.classList.toggle('tos-timer-choice-hidden',!timerRunning);

    const empty=section.querySelector('.tos-empty');
    if(empty && empty.innerHTML.includes('+ Add time')){
      empty.innerHTML=empty.innerHTML.replace('Tap <strong>+ Add time</strong> to add the first block.','Tap <strong>Add time</strong> to log the first block.');
    }
    if(empty && empty.innerHTML.includes('Add a job')){
      empty.innerHTML=empty.innerHTML.replace('Tap <strong>Add a job</strong> to add the first time block.','Tap <strong>Add time</strong> to log the first block.');
    }

    let card=section.querySelector('.tos-add-job-card');
    if(!card){
      card=document.createElement('button');
      card.type='button';
      card.className='tos-add-job-card';
      card.innerHTML=`
        <span class="tos-add-job-icon" aria-hidden="true">+</span>
        <span class="tos-add-job-copy">
          <strong>Add time</strong>
          <small>Run a timer or enter time manually</small>
        </span>
        <span class="tos-add-job-arrow" aria-hidden="true">›</span>`;
      list.insertAdjacentElement('beforebegin',card);
      card.addEventListener('click',()=>{
        if(card.disabled)return;
        openChoice(original,timer);
      });
    }else if(card.nextElementSibling!==list){
      list.insertAdjacentElement('beforebegin',card);
    }

    const locked=original.disabled;
    card.disabled=locked;
    card.classList.toggle('is-locked',locked);
    const title=card.querySelector('.tos-add-job-copy strong');
    const sub=card.querySelector('.tos-add-job-copy small');
    if(locked){
      if(title&&title.textContent!=='Week finalised')title.textContent='Week finalised';
      if(sub&&sub.textContent!=='Reopen the week to add time')sub.textContent='Reopen the week to add time';
    }else{
      if(title&&title.textContent!=='Add time')title.textContent='Add time';
      if(sub&&sub.textContent!=='Run a timer or enter time manually')sub.textContent='Run a timer or enter time manually';
    }
  }

  function openChoice(original,timer){
    document.querySelector('.tos-add-time-sheet')?.remove();
    const running=!!timer?.querySelector('#tos-stop-live');
    const overlay=document.createElement('div');
    overlay.className='tos-add-time-sheet';
    overlay.innerHTML=`
      <div class="tos-add-time-panel" role="dialog" aria-modal="true" aria-label="Add time">
        <div class="tos-add-time-handle"></div>
        <div class="tos-add-time-head">
          <div><p>ADD TIME</p><h3>How do you want to log it?</h3></div>
          <button type="button" class="tos-add-time-close" aria-label="Close">×</button>
        </div>
        <div class="tos-add-time-options">
          <button type="button" class="tos-add-time-option timer-option">
            <span class="tos-add-time-option-icon">▶</span>
            <span><strong>${running?'Timer running':'Run timer'}</strong><small>${running?'Open the timer to stop or review it':'Choose a job and clock the time live'}</small></span>
            <b>›</b>
          </button>
          <button type="button" class="tos-add-time-option manual-option">
            <span class="tos-add-time-option-icon">＋</span>
            <span><strong>Add manually</strong><small>Enter the job, start and finish time yourself</small></span>
            <b>›</b>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('.tos-add-time-close')?.addEventListener('click',close);
    overlay.querySelector('.manual-option')?.addEventListener('click',()=>{close();original.click();});
    overlay.querySelector('.timer-option')?.addEventListener('click',()=>{
      if(running){close();timer?.classList.remove('tos-timer-choice-hidden');timer?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      showTimerPicker(overlay,timer);
    });
  }

  function showTimerPicker(overlay,timer){
    const originalSelect=timer?.querySelector('#tos-timer-job');
    const panel=overlay.querySelector('.tos-add-time-panel');
    if(!panel)return;
    if(!originalSelect||!client){
      panel.innerHTML='<div class="tos-add-time-handle"></div><div class="tos-add-time-head"><div><p>RUN TIMER</p><h3>Timer is still loading</h3></div><button type="button" class="tos-add-time-close" aria-label="Close">×</button></div><div class="tos-add-time-note">Close this and try again in a moment.</div>';
      panel.querySelector('.tos-add-time-close')?.addEventListener('click',()=>overlay.remove());
      return;
    }
    const options=[...originalSelect.options].map(o=>`<option value="${esc(o.value)}" ${o.selected?'selected':''}>${esc(o.textContent||'Job')}</option>`).join('');
    panel.innerHTML=`
      <div class="tos-add-time-handle"></div>
      <div class="tos-add-time-head"><div><p>RUN TIMER</p><h3>Choose the job</h3></div><button type="button" class="tos-add-time-close" aria-label="Close">×</button></div>
      <label class="tos-add-time-field"><span>Job</span><select id="tos-add-time-job">${options}</select></label>
      <div class="tos-add-time-note" id="tos-add-time-error" hidden></div>
      <button type="button" class="tos-add-time-start">Start timer</button>`;
    panel.querySelector('.tos-add-time-close')?.addEventListener('click',()=>overlay.remove());
    panel.querySelector('.tos-add-time-start')?.addEventListener('click',async e=>{
      const btn=e.currentTarget;
      const id=panel.querySelector('#tos-add-time-job')?.value;
      if(!id)return;
      await startTimerDirect(id,overlay,btn);
    });
  }

  async function startTimerDirect(jobId,overlay,btn){
    const errorBox=overlay.querySelector('#tos-add-time-error');
    try{
      if(btn){btn.disabled=true;btn.textContent='Starting…';}
      if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
      const shared=Array.isArray(window.TradeOSTimesheetJobs)?window.TradeOSTimesheetJobs:[];
      let companyId=shared.find(j=>j.id===jobId)?.company_id||null;
      if(!companyId){
        const {data,error}=await client.from('jobs').select('company_id').eq('id',jobId).maybeSingle();
        if(error)throw error;
        companyId=data?.company_id||null;
      }
      if(!companyId)throw new Error('Could not find this job workspace.');
      const now=new Date();
      const {error}=await client.rpc('start_job_timer',{
        target_company:companyId,
        target_job:jobId,
        target_week_start:mondayIso(now),
        work_day:localIso(now),
        start_local:localTime(now)
      });
      if(error)throw error;
      if(btn)btn.textContent='Timer started';
      setTimeout(()=>location.reload(),180);
    }catch(err){
      if(btn){btn.disabled=false;btn.textContent='Start timer';}
      if(errorBox){
        errorBox.hidden=false;
        errorBox.textContent=friendlyError(err);
      }
    }
  }

  function mondayIso(date){const d=new Date(date);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return`${y}-${m}-${d}`;}
  function localTime(date){return`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;}
  function friendlyError(err){
    const msg=String(err?.message||'Could not start the timer.');
    if(/already running/i.test(msg))return 'A timer is already running. Open it from Timesheets to stop or cancel it.';
    if(/overlaps|covering this start time/i.test(msg))return 'You already have time logged over this start time. Edit that entry or start after it finishes.';
    if(/finalised|approved/i.test(msg))return 'This week is finalised. Reopen it before adding more time.';
    return msg;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();