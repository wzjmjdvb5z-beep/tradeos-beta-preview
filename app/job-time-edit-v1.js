(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false,busy=false,lastJobId=null,lastPage=null,lastKey='';
  let state=null;

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.job-detail-list-card[data-job-id]');
    if(card)lastJobId=card.dataset.jobId||null;
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const card=e.target.closest?.('.job-detail-list-card[data-job-id]');
    if(card)lastJobId=card.dataset.jobId||null;
  },true);

  async function getContext(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)return null;
    let companyId=document.querySelector('#company')?.value||null;
    let membership=null;
    if(companyId){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      if(r.error)throw r.error;
      membership=r.data||null;
    }
    if(!membership){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(r.error)throw r.error;
      membership=r.data||null;
      companyId=membership?.company_id||null;
    }
    return membership&&companyId?{user,companyId,membership}:null;
  }

  async function resolveJobId(page,ctx){
    if(lastJobId)return lastJobId;
    const title=page.querySelector('.tos-job-head-copy h2')?.textContent?.trim();
    if(!title)return null;
    const cards=[...document.querySelectorAll('.job-detail-list-card[data-job-id]')];
    const card=cards.find(x=>x.querySelector('.item-main > strong')?.textContent?.trim()===title);
    if(card)return card.dataset.jobId||null;
    const r=await client.from('jobs').select('id').eq('company_id',ctx.companyId).eq('title',title).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(r.error)throw r.error;
    return r.data?.id||null;
  }

  async function mount(){
    const page=document.querySelector('.tos-job-detail .tos-job-detail-page');
    if(!page){lastPage=null;lastKey='';state=null;return;}
    const rows=[...page.querySelectorAll('.tos-job-time-entry')];
    if(!rows.length||busy)return;
    if(page===lastPage&&page.dataset.jobTimeEditMounted==='1'&&rows.every(r=>r.dataset.jobTimeEditChecked==='1'))return;

    busy=true;
    try{
      const ctx=await getContext();
      if(!ctx)return;
      const jobId=await resolveJobId(page,ctx);
      if(!jobId)return;
      lastJobId=jobId;
      const r=await client.from('weekly_time_entries')
        .select('id,user_id,weekly_timesheet_id,job_id,work_date,start_time,end_time,break_minutes,hours,notes,created_at,updated_at')
        .eq('company_id',ctx.companyId).eq('job_id',jobId)
        .order('work_date',{ascending:false}).order('start_time',{ascending:false}).limit(300);
      if(r.error)throw r.error;
      const entries=r.data||[];
      state={ctx,jobId,entries,title:page.querySelector('.tos-job-head-copy h2')?.textContent?.trim()||'Job'};
      lastPage=page;
      lastKey=`${jobId}:${entries.map(e=>`${e.id}:${e.updated_at||''}`).join('|')}`;
      enhanceRows(page,rows,entries,ctx.user.id);
      page.dataset.jobTimeEditMounted='1';
    }catch(e){
      console.warn('TradeOS job time edit:',e);
    }finally{busy=false;}
  }

  function enhanceRows(page,rows,entries,userId){
    rows.forEach((row,index)=>{
      const entry=entries[index];
      row.dataset.jobTimeEditChecked='1';
      if(!entry)return;
      row.dataset.jobTimeEntryId=entry.id;
      const old=row.querySelector('.tos-job-time-edit-btn');
      if(entry.user_id!==userId){old?.remove();return;}
      if(old)return;
      const amount=row.querySelector(':scope > b');
      const side=document.createElement('div');
      side.className='tos-job-time-edit-side';
      if(amount){amount.replaceWith(side);side.appendChild(amount);}
      else row.appendChild(side);
      const button=document.createElement('button');
      button.type='button';
      button.className='tos-job-time-edit-btn';
      button.textContent='Edit';
      button.setAttribute('aria-label',`Edit time on ${entry.work_date}`);
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openEditor(entry);});
      side.appendChild(button);
    });
  }

  function openEditor(entry){
    if(!state)return;
    closeEditor();
    const start=trimTime(entry.start_time)||'09:00';
    const end=trimTime(entry.end_time)||finishFromHours(start,Number(entry.hours)||1);
    const breakMins=Number(entry.break_minutes)||0;
    const sheet=document.createElement('div');
    sheet.className='tos-job-time-edit-sheet';
    sheet.innerHTML=`<div class="tos-job-time-edit-panel" role="dialog" aria-modal="true" aria-label="Edit time">
      <div class="tos-job-time-edit-handle"></div>
      <div class="tos-job-time-edit-head">
        <div><span>EDIT TIME</span><h3>${esc(state.title)}</h3><p>${esc(formatDate(entry.work_date))}</p></div>
        <button type="button" class="tos-job-time-edit-close" aria-label="Close">×</button>
      </div>
      <form class="tos-job-time-edit-form">
        <div class="tos-job-time-edit-grid">
          <label><span>Start</span><input type="time" name="start" value="${esc(start)}" required></label>
          <label><span>Finish</span><input type="time" name="finish" value="${esc(end)}" required></label>
        </div>
        <label><span>Break <small>minutes</small></span><input type="number" name="break" min="0" max="1440" step="5" value="${breakMins}" inputmode="numeric"></label>
        <label><span>Task / notes <small>optional</small></span><textarea name="notes" rows="3" maxlength="1000" placeholder="What did you work on?">${esc(entry.notes||'')}</textarea></label>
        ${!entry.start_time||!entry.end_time?'<div class="tos-job-time-edit-info">This older entry did not have clock times saved. Check the start and finish before saving.</div>':''}
        <div class="tos-job-time-edit-total"><span>Recorded time</span><strong data-job-edit-total>—</strong></div>
        <div class="tos-job-time-edit-error" hidden></div>
        <button type="submit" class="tos-job-time-edit-save">Save changes</button>
      </form>
    </div>`;
    document.body.appendChild(sheet);
    document.body.classList.add('tos-job-time-edit-open');
    const form=sheet.querySelector('form');
    const updateTotal=()=>{
      const h=calculateHours(form.elements.start.value,form.elements.finish.value,Number(form.elements.break.value)||0);
      const out=sheet.querySelector('[data-job-edit-total]');
      if(out)out.textContent=h>0?`${formatHours(h)}h`:'—';
    };
    form.elements.start.addEventListener('input',updateTotal);
    form.elements.finish.addEventListener('input',updateTotal);
    form.elements.break.addEventListener('input',updateTotal);
    updateTotal();
    sheet.querySelector('.tos-job-time-edit-close')?.addEventListener('click',closeEditor);
    sheet.addEventListener('click',e=>{if(e.target===sheet)closeEditor();});
    form.addEventListener('submit',e=>saveEntry(e,entry,sheet));
  }

  async function saveEntry(event,entry,sheet){
    event.preventDefault();
    if(!state)return;
    const form=event.currentTarget;
    const save=form.querySelector('.tos-job-time-edit-save');
    const errorBox=form.querySelector('.tos-job-time-edit-error');
    const start=String(form.elements.start.value||'');
    const finish=String(form.elements.finish.value||'');
    const breakMins=Math.max(0,Number(form.elements.break.value)||0);
    const notes=String(form.elements.notes.value||'').trim();
    const total=calculateHours(start,finish,breakMins);
    if(!start||!finish||total<=0){showError(errorBox,'Check the start, finish and break times.');return;}
    save.disabled=true;save.textContent='Saving…';showError(errorBox,'');
    try{
      const r=await client.rpc('update_weekly_time_entry_clock',{
        target_entry:entry.id,
        target_job:state.jobId,
        start_at:start,
        end_at:finish,
        break_mins:breakMins,
        entry_notes:notes||null
      });
      if(r.error)throw r.error;
      closeEditor();
      toast('Time updated');
      reopenJob();
    }catch(e){
      save.disabled=false;save.textContent='Save changes';
      const message=String(e?.message||'Could not update this time entry.');
      showError(errorBox,/finalised/i.test(message)?'This week has been approved and is locked. Ask a manager to reopen it first.':message);
    }
  }

  function reopenJob(){
    const jobId=state?.jobId||lastJobId;
    if(!jobId)return;
    const detail=document.querySelector('.tos-job-detail');
    detail?.remove();
    document.body.classList.remove('tos-job-detail-open','tos-job-team-open');
    const card=document.querySelector(`.job-detail-list-card[data-job-id="${css(jobId)}"]`);
    if(card)setTimeout(()=>card.click(),80);
  }

  function closeEditor(){
    document.querySelector('.tos-job-time-edit-sheet')?.remove();
    document.body.classList.remove('tos-job-time-edit-open');
  }

  function calculateHours(start,end,breakMins){
    if(!start||!end)return 0;
    const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
    if(!Number.isFinite(sh)||!Number.isFinite(sm)||!Number.isFinite(eh)||!Number.isFinite(em))return 0;
    let mins=(eh*60+em)-(sh*60+sm);
    if(mins<=0)mins+=1440;
    mins-=Math.max(0,Number(breakMins)||0);
    return mins>0?mins/60:0;
  }

  function finishFromHours(start,hours){
    const [h,m]=String(start||'09:00').split(':').map(Number);
    let mins=(Number.isFinite(h)?h:9)*60+(Number.isFinite(m)?m:0)+Math.max(1,Math.round((Number(hours)||1)*60));
    mins%=1440;
    return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  }
  function trimTime(v){return v?String(v).slice(0,5):'';}
  function formatHours(v){const n=Math.round((Number(v)||0)*100)/100;return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');}
  function formatDate(v){try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${v}T12:00:00`));}catch(_){return v||'';}}
  function showError(el,msg){if(!el)return;el.textContent=msg||'';el.hidden=!msg;}
  function toast(message){
    document.querySelector('.tos-job-time-edit-toast')?.remove();
    const t=document.createElement('div');t.className='tos-job-time-edit-toast';t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2200);
  }
  function css(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  window.addEventListener('pageshow',()=>{closeEditor();schedule();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.tos-job-time-edit-sheet'))closeEditor();});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
