(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let running=null;
  let interval=null;
  let scheduled=false;

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
    const shell=document.querySelector('.tos-ts');
    if(!shell)return;
    let card=shell.querySelector('.tos-live-timer');
    if(!card){
      card=document.createElement('section');
      card.className='tos-live-timer';
      const weekCard=shell.querySelector('.tos-week-card');
      shell.insertBefore(card,weekCard||shell.firstChild);
    }
    if(card.dataset.loading==='1')return;
    card.dataset.loading='1';
    await loadRunning();
    render(card);
    card.dataset.loading='0';
  }
  async function loadRunning(){
    const {data:{user}}=await client.auth.getUser().catch(()=>({data:{user:null}}));
    if(!user){running=null;return;}
    const {data,error}=await client.from('job_timer_sessions')
      .select('id,company_id,user_id,job_id,week_start,work_date,started_at,start_time,status')
      .eq('user_id',user.id).eq('status','running').order('started_at',{ascending:false}).limit(1).maybeSingle();
    if(!error)running=data||null;
  }
  function render(card){
    stopTick();
    const jobs=getJobs();
    if(running){
      const title=jobs.find(j=>j.id===running.job_id)?.title||'Current job';
      card.innerHTML=`<div class="tos-live-head"><div><p class="eyebrow">LIVE TIMER</p><h3>Timer running</h3><p>Your timer stays active even if you leave this page.</p></div><span class="tos-live-dot running"></span></div><div class="tos-running-card"><div class="tos-running-job"><div><strong>${esc(title)}</strong><small>Started ${esc(trimTime(running.start_time))} · ${esc(longDate(running.work_date))}</small></div></div><div class="tos-elapsed" id="tos-elapsed">${elapsedText(running.started_at)}</div><div class="tos-running-actions"><button class="tos-cancel-timer" id="tos-cancel-live">Cancel timer</button><button class="tos-stop-btn" id="tos-stop-live">Stop timer</button></div></div>`;
      card.querySelector('#tos-stop-live')?.addEventListener('click',()=>openStopSheet(title));
      card.querySelector('#tos-cancel-live')?.addEventListener('click',cancelTimer);
      interval=setInterval(()=>{const el=document.getElementById('tos-elapsed');if(el)el.textContent=elapsedText(running.started_at)},1000);
    }else{
      card.innerHTML=`<div class="tos-live-head"><div><p class="eyebrow">LIVE TIMER</p><h3>Start a job timer</h3><p>Pick the job and TradeOS will clock the time for you.</p></div><span class="tos-live-dot"></span></div>${jobs.length?`<div class="tos-live-form"><div class="tos-live-field"><label>Job</label><select id="tos-timer-job">${jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.title)}</option>`).join('')}</select></div><button class="tos-timer-start" id="tos-start-live">Start timer</button></div><div class="tos-live-note">Live timers always record today. Existing manual time for the same job/day is protected from being overwritten.</div>`:`<div class="tos-live-note">Add or assign a job before starting a timer.</div>`}`;
      card.querySelector('#tos-start-live')?.addEventListener('click',startTimer);
    }
  }
  function getJobs(){
    const map=new Map();
    document.querySelectorAll('[data-hour-job]').forEach(input=>{
      const id=input.dataset.hourJob;if(!id||map.has(id))return;
      const row=input.closest('tr');
      const title=row?.querySelector('.job-col strong')?.textContent?.trim()||'Job';
      map.set(id,{id,title});
    });
    return [...map.values()];
  }
  async function startTimer(){
    const btn=document.querySelector('#tos-start-live');
    const jobId=document.querySelector('#tos-timer-job')?.value;
    if(!jobId)return;
    const now=new Date();
    const workDate=localIso(now),weekStart=mondayIso(now),startLocal=localTime(now);
    try{
      if(btn){btn.disabled=true;btn.textContent='Starting…';}
      const companyId=await companyForJob(jobId);
      const {data,error}=await client.rpc('start_job_timer',{target_company:companyId,target_job:jobId,target_week_start:weekStart,work_day:workDate,start_local:startLocal});
      if(error)throw error;
      running={id:data,company_id:companyId,job_id:jobId,week_start:weekStart,work_date:workDate,started_at:new Date().toISOString(),start_time:startLocal,status:'running'};
      const card=document.querySelector('.tos-live-timer');if(card)render(card);
    }catch(err){alert(err?.message||'Could not start the timer.');if(btn){btn.disabled=false;btn.textContent='Start timer';}}
  }
  function openStopSheet(title){
    document.querySelector('.tos-timer-sheet')?.remove();
    const overlay=document.createElement('div');
    overlay.className='tos-timer-sheet';
    overlay.innerHTML=`<div class="tos-timer-panel"><div class="tos-timer-handle"></div><h3>Stop timer</h3><p class="sub">${esc(title)} · started ${esc(trimTime(running.start_time))}</p><div class="tos-live-field"><label>Break</label><select id="tos-stop-break"><option value="0">No break</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></div><div class="tos-timer-summary"><span>Elapsed</span><strong id="tos-stop-elapsed">${elapsedText(running.started_at)}</strong></div><div class="tos-timer-panel-actions"><button class="tos-timer-back" id="tos-stop-back">Keep running</button><button class="tos-timer-save" id="tos-stop-save">Stop & save</button></div></div>`;
    document.body.appendChild(overlay);
    const tick=setInterval(()=>{const el=overlay.querySelector('#tos-stop-elapsed');if(el)el.textContent=elapsedText(running.started_at)},1000);
    const close=()=>{clearInterval(tick);overlay.remove()};
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('#tos-stop-back')?.addEventListener('click',close);
    overlay.querySelector('#tos-stop-save')?.addEventListener('click',async()=>{
      const save=overlay.querySelector('#tos-stop-save');const breakMinutes=Number(overlay.querySelector('#tos-stop-break')?.value||0);const endLocal=localTime(new Date());
      try{
        save.disabled=true;save.textContent='Saving…';
        const {error}=await client.rpc('stop_job_timer',{target_timer:running.id,end_local:endLocal,break_mins:breakMinutes});
        if(error)throw error;
        clearInterval(tick);overlay.remove();running=null;stopTick();
        setTimeout(()=>location.reload(),120);
      }catch(err){alert(err?.message||'Could not stop the timer.');save.disabled=false;save.textContent='Stop & save';}
    });
  }
  async function cancelTimer(){
    if(!running)return;
    if(!confirm('Cancel this timer without adding it to the timesheet?'))return;
    const btn=document.querySelector('#tos-cancel-live');
    try{
      if(btn){btn.disabled=true;btn.textContent='Cancelling…';}
      const {error}=await client.rpc('cancel_job_timer',{target_timer:running.id});
      if(error)throw error;
      running=null;stopTick();const card=document.querySelector('.tos-live-timer');if(card)render(card);
    }catch(err){alert(err?.message||'Could not cancel the timer.');if(btn){btn.disabled=false;btn.textContent='Cancel timer';}}
  }
  async function companyForJob(jobId){const {data,error}=await client.from('jobs').select('company_id').eq('id',jobId).single();if(error)throw error;return data.company_id;}
  function elapsedText(startedAt){const ms=Math.max(0,Date.now()-new Date(startedAt).getTime());const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function stopTick(){if(interval){clearInterval(interval);interval=null;}}
  function mondayIso(date){const d=new Date(date);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
  function localTime(date){return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;}
  function longDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(y,m-1,d,12));}
  function trimTime(v){return String(v||'').slice(0,5);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
