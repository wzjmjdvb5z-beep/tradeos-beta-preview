(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  const companyByJob=new Map();
  const clockCache=new Map();
  let scheduled=false;

  function start(){
    if(!client)return;
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-tos-date]')) setTimeout(()=>decorateActiveDay(true),50);
    });
    schedule();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      enhanceOpenSheet();
      decorateActiveDay(false);
    });
  }

  function enhanceOpenSheet(){
    const form=document.querySelector('#tos-time-form');
    if(!form||form.dataset.clockEnhanced==='1')return;
    form.dataset.clockEnhanced='1';

    const durationField=[...form.querySelectorAll('.tos-field')].find(x=>x.querySelector('label')?.textContent?.trim()==='Duration');
    const quick=form.querySelector('.tos-quick');
    if(durationField)durationField.classList.add('tos-clock-hidden');
    if(quick)quick.classList.add('tos-clock-hidden');

    const actions=form.querySelector('.tos-sheet-actions');
    const clock=document.createElement('div');
    clock.className='tos-clock-block';
    clock.innerHTML=`
      <div class="tos-clock-grid">
        <div class="tos-field"><label>Start time</label><input type="time" name="startTime" value="08:00" required></div>
        <div class="tos-field"><label>Finish time</label><input type="time" name="endTime" value="17:00" required></div>
      </div>
      <div class="tos-field"><label>Break</label><select name="breakMinutes">
        <option value="0">No break</option>
        <option value="15">15 minutes</option>
        <option value="30">30 minutes</option>
        <option value="45">45 minutes</option>
        <option value="60">1 hour</option>
        <option value="90">1 hour 30 minutes</option>
      </select></div>
      <div class="tos-clock-total"><span>Recorded time</span><strong id="tos-clock-total-value">9h</strong></div>`;
    form.insertBefore(clock,actions);

    const updateTotal=()=>{
      const start=form.elements.startTime.value;
      const end=form.elements.endTime.value;
      const br=Number(form.elements.breakMinutes.value)||0;
      const hours=calculateHours(start,end,br);
      const el=form.querySelector('#tos-clock-total-value');
      if(el)el.textContent=hours>0?formatDuration(hours):'—';
    };
    form.elements.startTime.addEventListener('input',updateTotal);
    form.elements.endTime.addEventListener('input',updateTotal);
    form.elements.breakMinutes.addEventListener('change',updateTotal);

    const selectedDate=getSelectedDate();
    const jobSelect=form.elements.job;
    const loadExisting=()=>hydrateDialog(form,selectedDate,String(jobSelect?.value||''),updateTotal);
    jobSelect?.addEventListener('change',loadExisting);
    loadExisting();

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      const date=getSelectedDate();
      const jobId=String(jobSelect?.value||'');
      const startTime=form.elements.startTime.value;
      const endTime=form.elements.endTime.value;
      const breakMinutes=Number(form.elements.breakMinutes.value)||0;
      const hours=calculateHours(startTime,endTime,breakMinutes);
      if(!date||!jobId){alert('Choose a job and day first.');return;}
      if(!startTime||!endTime){alert('Choose a start and finish time.');return;}
      if(hours<=0||hours>24){alert('Check the start, finish and break times.');return;}
      const save=form.querySelector('.tos-save');
      if(save){save.disabled=true;save.textContent='Saving…';}
      try{
        const companyId=await getCompanyId(jobId);
        const weekStart=getWeekStart(date);
        const {error}=await client.rpc('upsert_weekly_time_entry_clock',{
          target_company:companyId,
          target_week_start:weekStart,
          target_job:jobId,
          work_day:date,
          start_at:startTime,
          end_at:endTime,
          break_mins:breakMinutes,
          entry_notes:null
        });
        if(error)throw error;
        clockCache.set(cacheKey(jobId,date),{job_id:jobId,work_date:date,start_time:startTime,end_time:endTime,break_minutes:breakMinutes,hours});
        const source=document.querySelector(`[data-hour-job="${cssEscape(jobId)}"][data-hour-date="${date}"]`);
        if(!source)throw new Error('The job is no longer available for this week.');
        source.value=String(Math.round(hours*100)/100);
        source.dispatchEvent(new Event('change',{bubbles:true}));
        document.querySelector('.tos-sheet')?.remove();
      }catch(err){
        alert(err?.message||'Could not save the time entry.');
        if(save){save.disabled=false;save.textContent='Save time';}
      }
    },true);
  }

  async function hydrateDialog(form,date,jobId,updateTotal){
    if(!date||!jobId)return updateTotal();
    try{
      let entry=clockCache.get(cacheKey(jobId,date));
      if(!entry){
        const {data:{user}}=await client.auth.getUser();
        if(user){
          const {data,error}=await client.from('weekly_time_entries')
            .select('job_id,work_date,hours,start_time,end_time,break_minutes')
            .eq('user_id',user.id).eq('job_id',jobId).eq('work_date',date).maybeSingle();
          if(error)throw error;
          if(data){entry=data;clockCache.set(cacheKey(jobId,date),data);}
        }
      }
      if(entry?.start_time&&entry?.end_time){
        form.elements.startTime.value=trimTime(entry.start_time);
        form.elements.endTime.value=trimTime(entry.end_time);
        form.elements.breakMinutes.value=String(entry.break_minutes||0);
      }else{
        const oldHours=Number(form.elements.hours?.value||0)+(Number(form.elements.minutes?.value||0)/60);
        if(oldHours>0){
          form.elements.startTime.value='08:00';
          form.elements.endTime.value=addHours('08:00',oldHours);
          form.elements.breakMinutes.value='0';
        }
      }
    }catch{}
    updateTotal();
  }

  async function decorateActiveDay(force){
    const shell=document.querySelector('.tos-ts');
    const date=getSelectedDate();
    if(!shell||!date)return;
    const buttons=[...shell.querySelectorAll('[data-tos-edit]')];
    if(!buttons.length)return;
    const {data:{user}}=await client.auth.getUser().catch(()=>({data:{user:null}}));
    if(!user)return;
    const jobIds=[...new Set(buttons.map(b=>b.dataset.tosEdit).filter(Boolean))];
    if(force||jobIds.some(id=>!clockCache.has(cacheKey(id,date)))){
      const {data,error}=await client.from('weekly_time_entries')
        .select('job_id,work_date,hours,start_time,end_time,break_minutes')
        .eq('user_id',user.id).eq('work_date',date).in('job_id',jobIds);
      if(!error)for(const item of data||[])clockCache.set(cacheKey(item.job_id,item.work_date),item);
    }
    for(const button of buttons){
      const entry=clockCache.get(cacheKey(button.dataset.tosEdit,date));
      if(!entry?.start_time||!entry?.end_time)continue;
      const card=button.closest('.tos-entry-card');
      const small=card?.querySelector('.tos-entry-main small');
      if(!small)continue;
      const br=Number(entry.break_minutes)||0;
      const span=`${trimTime(entry.start_time)}–${trimTime(entry.end_time)}`;
      small.textContent=br?`${span} · ${br} min break`:`${span} · no break`;
    }
  }

  async function getCompanyId(jobId){
    if(companyByJob.has(jobId))return companyByJob.get(jobId);
    const {data,error}=await client.from('jobs').select('company_id').eq('id',jobId).single();
    if(error)throw error;
    companyByJob.set(jobId,data.company_id);
    return data.company_id;
  }

  function calculateHours(start,end,breakMinutes){
    if(!start||!end)return 0;
    let startMin=timeToMinutes(start),endMin=timeToMinutes(end);
    let gross=endMin-startMin;
    if(gross<=0)gross+=1440;
    const net=gross-(Number(breakMinutes)||0);
    return net>0?net/60:0;
  }
  function timeToMinutes(value){const [h,m]=String(value).split(':').map(Number);return h*60+m;}
  function addHours(start,hours){const mins=(timeToMinutes(start)+Math.round(hours*60))%1440;return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}
  function formatDuration(hours){const mins=Math.round(hours*60),h=Math.floor(mins/60),m=mins%60;return h&&m?`${h}h ${m}m`:h?`${h}h`:`${m}m`;}
  function trimTime(value){return String(value||'').slice(0,5);}
  function cacheKey(jobId,date){return `${jobId}|${date}`;}
  function getSelectedDate(){return document.querySelector('.tos-day.active')?.dataset.tosDate||null;}
  function getWeekStart(date){const d=toDate(date);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return localIso(d);}
  function toDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0);}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
  function cssEscape(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/(["\\])/g,'\\$1');}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
