(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let running=null;
  let jobs=[];
  let tick=null;
  let mounting=false;

  function start(){
    new MutationObserver(()=>mount()).observe(document.documentElement,{childList:true,subtree:true});
    mount();
  }

  async function mount(){
    const shell=document.querySelector('.tos-ts');
    if(!shell||shell.querySelector('.tos-live-timer-v2')||mounting)return;
    mounting=true;
    const card=document.createElement('section');
    card.className='tos-live-timer tos-live-timer-v2';
    card.innerHTML='<div class="tos-live-note">Loading jobs…</div>';
    const weekCard=shell.querySelector('.tos-week-card');
    shell.insertBefore(card,weekCard||shell.firstChild);
    try{
      const result=await Promise.all([loadRunning(),loadJobs()]);
      running=result[0];
      jobs=result[1];
      render(card);
    }catch(err){
      card.innerHTML=`<div class="tos-live-head"><div><p class="eyebrow">LIVE TIMER</p><h3>Couldn’t load jobs</h3><p>${esc(friendlyError(err))}</p></div></div><button class="tos-timer-start" id="tos-retry-jobs">Retry</button>`;
      card.querySelector('#tos-retry-jobs')?.addEventListener('click',()=>{card.remove();mount();});
    }finally{mounting=false;}
  }

  async function loadRunning(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError)throw userError;
    if(!user)return null;
    const {data,error}=await client.from('job_timer_sessions')
      .select('id,company_id,user_id,job_id,week_start,work_date,started_at,start_time,status')
      .eq('user_id',user.id)
      .eq('status','running')
      .order('started_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error)throw error;
    return data||null;
  }

  async function loadJobs(){
    let companyId=null;
    const shared=Array.isArray(window.TradeOSTimesheetJobs)?window.TradeOSTimesheetJobs:[];
    if(shared.length&&shared[0]?.company_id)companyId=shared[0].company_id;
    const {data,error}=await client.rpc('list_timesheet_jobs_v2',{target_company:companyId});
    if(error)throw error;
    return (data||[]).map(j=>({company_id:j.company_id,id:j.id,title:j.title||'Untitled job',status:j.status||''}));
  }

  function render(card){
    stopTick();
    if(running){
      const job=jobs.find(j=>j.id===running.job_id);
      const title=job?.title||'Current job';
      card.innerHTML=`<div class="tos-live-head"><div><p class="eyebrow">LIVE TIMER</p><h3>Timer running</h3><p>Your timer stays active even if you leave this page.</p></div><span class="tos-live-dot running"></span></div><div class="tos-running-card"><div class="tos-running-job"><div><strong>${esc(title)}</strong><small>Started ${esc(trimTime(running.start_time))} · ${esc(longDate(running.work_date))}</small></div></div><div class="tos-elapsed" id="tos-elapsed">${elapsedText(running.started_at)}</div><div id="tos-live-message"></div><div class="tos-running-actions"><button class="tos-cancel-timer" id="tos-cancel-live">Cancel timer</button><button class="tos-stop-btn" id="tos-stop-live">Stop timer</button></div></div>`;
      card.querySelector('#tos-stop-live')?.addEventListener('click',()=>openStopSheet(title));
      card.querySelector('#tos-cancel-live')?.addEventListener('click',openCancelSheet);
      tick=setInterval(()=>{const el=card.querySelector('#tos-elapsed');if(el)el.textContent=elapsedText(running.started_at)},1000);
      return;
    }

    if(!jobs.length){
      card.innerHTML='<div class="tos-live-head"><div><p class="eyebrow">LIVE TIMER</p><h3>No jobs available</h3><p>Create or assign a job before starting a timer.</p></div><span class="tos-live-dot"></span></div>';
      return;
    }

    card.innerHTML=`<div class="tos-live-head"><div><p class="eyebrow">LIVE TIMER</p><h3>Start a job timer</h3><p>Pick the job and TradeOS will clock the time for you.</p></div><span class="tos-live-dot"></span></div><div class="tos-live-form"><div class="tos-live-field"><label>Job · ${jobs.length} available</label><select id="tos-timer-job">${jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.title)}</option>`).join('')}</select></div><button class="tos-timer-start" id="tos-start-live">Start timer</button></div><div id="tos-live-message"></div><div class="tos-live-note">Approved weeks are finalised. Starting a timer on a submitted week returns it to Draft so the updated week can be submitted again.</div>`;
    card.querySelector('#tos-start-live')?.addEventListener('click',startTimer);
  }

  async function refreshJobs(){
    jobs=await loadJobs();
    const card=document.querySelector('.tos-live-timer-v2');
    if(card)render(card);
  }

  async function startTimer(){
    const btn=document.querySelector('#tos-start-live');
    const jobId=document.querySelector('#tos-timer-job')?.value;
    const job=jobs.find(j=>j.id===jobId);
    if(!jobId||!job)return;
    clearLiveMessage();
    const now=new Date();
    try{
      if(btn){btn.disabled=true;btn.textContent='Starting…';}
      const {data,error}=await client.rpc('start_job_timer',{target_company:job.company_id,target_job:jobId,target_week_start:mondayIso(now),work_day:localIso(now),start_local:localTime(now)});
      if(error)throw error;
      running={id:data,company_id:job.company_id,job_id:jobId,week_start:mondayIso(now),work_date:localIso(now),started_at:new Date().toISOString(),start_time:localTime(now),status:'running'};
      const card=document.querySelector('.tos-live-timer-v2');
      if(card)render(card);
    }catch(err){
      showLiveMessage(friendlyError(err),'error');
      if(btn){btn.disabled=false;btn.textContent='Start timer';}
    }
  }

  function openStopSheet(title){
    document.querySelector('.tos-timer-sheet')?.remove();
    const overlay=document.createElement('div');
    overlay.className='tos-timer-sheet';
    overlay.innerHTML=`<div class="tos-timer-panel"><div class="tos-timer-handle"></div><h3>Stop timer</h3><p class="sub">${esc(title)} · started ${esc(trimTime(running.start_time))}</p><div class="tos-live-field"><label>Break</label><select id="tos-stop-break"><option value="0">No break</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></div><div class="tos-timer-summary"><span>Elapsed</span><strong id="tos-stop-elapsed">${elapsedText(running.started_at)}</strong></div><div id="tos-stop-message"></div><div class="tos-timer-panel-actions"><button class="tos-timer-back" id="tos-stop-back">Keep running</button><button class="tos-timer-save" id="tos-stop-save">Stop & save</button></div></div>`;
    document.body.appendChild(overlay);
    const sheetTick=setInterval(()=>{const el=overlay.querySelector('#tos-stop-elapsed');if(el)el.textContent=elapsedText(running.started_at)},1000);
    const close=()=>{clearInterval(sheetTick);overlay.remove();};
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('#tos-stop-back')?.addEventListener('click',close);
    overlay.querySelector('#tos-stop-save')?.addEventListener('click',()=>finishTimer(overlay,sheetTick));
  }

  async function finishTimer(overlay,sheetTick){
    const save=overlay.querySelector('#tos-stop-save');
    const message=overlay.querySelector('#tos-stop-message');
    const breakMinutes=Number(overlay.querySelector('#tos-stop-break')?.value||0);
    if(message)message.innerHTML='';
    try{
      if(save){save.disabled=true;save.textContent='Saving…';}
      const {error}=await client.rpc('stop_job_timer',{target_timer:running.id,end_local:localTime(new Date()),break_mins:breakMinutes});
      if(error)throw error;
      clearInterval(sheetTick);
      overlay.remove();
      running=null;
      stopTick();
      setTimeout(()=>location.reload(),100);
    }catch(err){
      if(save){save.disabled=false;save.textContent='Stop & save';}
      if(isFinalisedError(err))await renderFinalisedWeekAction(overlay,sheetTick);
      else if(message)message.innerHTML=`<div class="tos-timer-error"><strong>Couldn’t save that time</strong><span>${esc(friendlyError(err))}</span></div>`;
    }
  }

  async function renderFinalisedWeekAction(overlay,sheetTick){
    const message=overlay.querySelector('#tos-stop-message');
    if(!message)return;
    const access=await getWeekAccess();
    if(access.canReopen&&access.sheetId){
      message.innerHTML='<div class="tos-timer-error soft"><strong>This week is finalised</strong><span>Reopen it to add this timer.</span><button class="tos-reopen-btn" id="tos-reopen-save">Reopen week & save time</button></div>';
      overlay.querySelector('#tos-reopen-save')?.addEventListener('click',async e=>{
        const btn=e.currentTarget;
        try{
          btn.disabled=true;btn.textContent='Reopening…';
          const {error}=await client.rpc('reopen_weekly_timesheet',{target_weekly_timesheet:access.sheetId});
          if(error)throw error;
          await finishTimer(overlay,sheetTick);
        }catch(err){
          btn.disabled=false;btn.textContent='Reopen week & save time';
          message.innerHTML=`<div class="tos-timer-error"><strong>Couldn’t reopen the week</strong><span>${esc(friendlyError(err))}</span></div>`;
        }
      });
    }else{
      message.innerHTML='<div class="tos-timer-error soft"><strong>This week has been approved</strong><span>Ask a manager to reopen it first. Your running timer has not been lost.</span></div>';
    }
  }

  async function getWeekAccess(){
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user||!running)return{canReopen:false,sheetId:null};
      const [memberResult,sheetResult]=await Promise.all([
        client.from('company_members').select('role').eq('company_id',running.company_id).eq('user_id',user.id).eq('active',true).maybeSingle(),
        client.from('weekly_timesheets').select('id,status').eq('company_id',running.company_id).eq('user_id',user.id).eq('week_start',running.week_start).maybeSingle()
      ]);
      return{canReopen:['owner','admin','manager'].includes(memberResult.data?.role),sheetId:sheetResult.data?.id||null};
    }catch{return{canReopen:false,sheetId:null};}
  }

  function openCancelSheet(){
    if(!running)return;
    document.querySelector('.tos-timer-sheet')?.remove();
    const overlay=document.createElement('div');
    overlay.className='tos-timer-sheet';
    overlay.innerHTML='<div class="tos-timer-panel"><div class="tos-timer-handle"></div><h3>Cancel timer?</h3><p class="sub">This removes the running timer without adding time to your timesheet.</p><div id="tos-cancel-message"></div><div class="tos-timer-panel-actions"><button class="tos-timer-back" id="tos-cancel-back">Keep running</button><button class="tos-timer-danger" id="tos-cancel-confirm">Cancel timer</button></div></div>';
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('#tos-cancel-back')?.addEventListener('click',close);
    overlay.querySelector('#tos-cancel-confirm')?.addEventListener('click',async e=>{
      const btn=e.currentTarget;
      try{
        btn.disabled=true;btn.textContent='Cancelling…';
        const {error}=await client.rpc('cancel_job_timer',{target_timer:running.id});
        if(error)throw error;
        overlay.remove();running=null;stopTick();await refreshJobs();
      }catch(err){
        btn.disabled=false;btn.textContent='Cancel timer';
        const m=overlay.querySelector('#tos-cancel-message');
        if(m)m.innerHTML=`<div class="tos-timer-error"><strong>Couldn’t cancel the timer</strong><span>${esc(friendlyError(err))}</span></div>`;
      }
    });
  }

  function showLiveMessage(text,type='error'){
    const el=document.querySelector('#tos-live-message');
    if(el)el.innerHTML=`<div class="tos-live-message ${type}">${esc(text)}</div>`;
  }
  function clearLiveMessage(){const el=document.querySelector('#tos-live-message');if(el)el.innerHTML='';}
  function isFinalisedError(err){return /finalised|approved/i.test(String(err?.message||''));}
  function friendlyError(err){const msg=String(err?.message||'Something went wrong.');return isFinalisedError(err)?'This week has already been approved and finalised.':msg;}
  function elapsedText(startedAt){const ms=Math.max(0,Date.now()-new Date(startedAt).getTime());const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function stopTick(){if(tick){clearInterval(tick);tick=null;}}
  function mondayIso(date){const d=new Date(date);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return`${y}-${m}-${d}`;}
  function localTime(date){return`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;}
  function longDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(y,m-1,d,12));}
  function trimTime(v){return String(v||'').slice(0,5);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  window.addEventListener('tradeos:timesheet-jobs',()=>{
    const card=document.querySelector('.tos-live-timer-v2');
    if(card&&!running)refreshJobs().catch(()=>{});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();