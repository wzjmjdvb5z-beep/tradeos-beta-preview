(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

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

    let card=section.querySelector('.tos-add-job-card');
    if(!card){
      card=document.createElement('button');
      card.type='button';
      card.className='tos-add-job-card';
      card.innerHTML='<span class="tos-add-job-icon" aria-hidden="true">+</span><span class="tos-add-job-copy"><strong>Add time</strong><small>Run a timer or enter time manually</small></span><span class="tos-add-job-arrow" aria-hidden="true">›</span>';
      list.insertAdjacentElement('beforebegin',card);
      card.addEventListener('click',()=>{if(!card.disabled)openChoice(original);});
    }

    const locked=original.disabled;
    card.disabled=locked;
    card.classList.toggle('is-locked',locked);
    const title=card.querySelector('.tos-add-job-copy strong');
    const sub=card.querySelector('.tos-add-job-copy small');
    if(locked){
      if(title)title.textContent='Week finalised';
      if(sub)sub.textContent='Reopen the week to add time';
    }else{
      if(title)title.textContent='Add time';
      if(sub)sub.textContent='Run a timer or enter time manually';
    }
  }

  async function openChoice(original){
    document.querySelector('.tos-add-time-sheet')?.remove();
    const running=await getRunningTimer();
    const overlay=document.createElement('div');
    overlay.className='tos-add-time-sheet';
    overlay.innerHTML=`<div class="tos-add-time-panel" role="dialog" aria-modal="true" aria-label="Add time"><div class="tos-add-time-handle"></div><div class="tos-add-time-head"><div><p>ADD TIME</p><h3>How do you want to log it?</h3></div><button type="button" class="tos-add-time-close" aria-label="Close">×</button></div><div class="tos-add-time-options"><button type="button" class="tos-add-time-option timer-option"><span class="tos-add-time-option-icon">▶</span><span><strong>${running?'Timer running':'Run timer'}</strong><small>${running?'Open the running timer':'Choose a job and clock the time live'}</small></span><b>›</b></button><button type="button" class="tos-add-time-option manual-option"><span class="tos-add-time-option-icon">＋</span><span><strong>Add manually</strong><small>Enter the job, start and finish time yourself</small></span><b>›</b></button></div></div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('.tos-add-time-close')?.addEventListener('click',close);
    overlay.querySelector('.manual-option')?.addEventListener('click',()=>{close();original.click();});
    overlay.querySelector('.timer-option')?.addEventListener('click',()=>{
      if(running){close();const timer=document.querySelector('.tos-live-timer-v2');timer?.classList.remove('tos-timer-choice-hidden');timer?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      showTimerPicker(overlay);
    });
  }

  async function getRunningTimer(){
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user)return null;
      const {data}=await client.from('job_timer_sessions').select('id').eq('user_id',user.id).eq('status','running').limit(1).maybeSingle();
      return data||null;
    }catch{return null;}
  }

  function availableJobs(){
    const shared=Array.isArray(window.TradeOSTimesheetJobs)?window.TradeOSTimesheetJobs:[];
    if(shared.length)return shared.map(j=>({id:j.id,title:j.title||'Untitled job',company_id:j.company_id||null}));
    const select=document.querySelector('.tos-live-timer-v2 #tos-timer-job');
    return select?[...select.options].map(o=>({id:o.value,title:o.textContent||'Job',company_id:null})).filter(j=>j.id):[];
  }

  function showTimerPicker(overlay){
    const panel=overlay.querySelector('.tos-add-time-panel');
    if(!panel)return;
    const jobs=availableJobs();
    if(!jobs.length){
      panel.innerHTML='<div class="tos-add-time-handle"></div><div class="tos-add-time-head"><div><p>RUN TIMER</p><h3>No jobs available yet</h3></div><button type="button" class="tos-add-time-close" aria-label="Close">×</button></div><div class="tos-add-time-note">Wait a moment for Timesheets to finish loading, then try again.</div>';
      panel.querySelector('.tos-add-time-close')?.addEventListener('click',()=>overlay.remove());
      return;
    }
    panel.innerHTML=`<div class="tos-add-time-handle"></div><div class="tos-add-time-head"><div><p>RUN TIMER</p><h3>Choose the job</h3></div><button type="button" class="tos-add-time-close" aria-label="Close">×</button></div><label class="tos-add-time-field"><span>Job</span><select id="tos-add-time-job">${jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.title)}</option>`).join('')}</select></label><div class="tos-add-time-note" id="tos-add-time-error" hidden></div><button type="button" class="tos-add-time-start">Start timer</button>`;
    panel.querySelector('.tos-add-time-close')?.addEventListener('click',()=>overlay.remove());
    panel.querySelector('.tos-add-time-start')?.addEventListener('click',async e=>{
      const btn=e.currentTarget;
      const jobId=panel.querySelector('#tos-add-time-job')?.value;
      if(!jobId)return;
      await startTimer(jobId,jobs,overlay,btn);
    });
  }

  async function startTimer(jobId,jobs,overlay,btn){
    const errorBox=overlay.querySelector('#tos-add-time-error');
    try{
      if(btn){btn.disabled=true;btn.textContent='Starting…';}
      if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
      let companyId=jobs.find(j=>j.id===jobId)?.company_id||null;
      if(!companyId){
        const {data,error}=await client.from('jobs').select('company_id').eq('id',jobId).maybeSingle();
        if(error)throw error;
        companyId=data?.company_id||null;
      }
      if(!companyId)throw new Error('Could not find this job workspace.');
      const now=new Date();
      const {data,error}=await client.rpc('start_job_timer',{target_company:companyId,target_job:jobId,target_week_start:mondayIso(now),work_day:localIso(now),start_local:localTime(now)});
      if(error)throw error;
      if(!data)throw new Error('Timer did not start. Please try again.');
      if(btn)btn.textContent='Timer started';
      setTimeout(()=>location.reload(),120);
    }catch(err){
      if(btn){btn.disabled=false;btn.textContent='Start timer';}
      if(errorBox){errorBox.hidden=false;errorBox.textContent=friendlyError(err);}
    }
  }

  function mondayIso(date){const d=new Date(date);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return`${y}-${m}-${d}`;}
  function localTime(date){return`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;}
  function friendlyError(err){const msg=String(err?.message||'Could not start the timer.');if(/already running/i.test(msg))return'A timer is already running.';if(/overlaps|covering this start time/i.test(msg))return'You already have time logged over this start time. Edit that entry or start after it finishes.';if(/finalised|approved/i.test(msg))return'This week is finalised. Reopen it before adding more time.';return msg;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();