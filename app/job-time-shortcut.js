(()=>{
  let queued=false;

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  function mount(){
    removeListShortcuts();
    mountJobDetail();
    continuePendingTimeEntry();
  }

  function removeListShortcuts(){
    document.querySelectorAll('[data-job-time-shortcut]').forEach(b=>b.remove());
  }

  function mountJobDetail(){
    const detail=document.querySelector('.tos-job-detail .tos-job-detail-page');
    if(!detail||detail.querySelector('[data-job-detail-log-time]'))return;
    const title=detail.querySelector('.tos-job-head-copy h2')?.textContent?.trim()||'Job';
    const matching=[...document.querySelectorAll('.job-detail-list-card[data-job-id]')].find(card=>card.querySelector('.item-main > strong')?.textContent?.trim()===title);
    const jobId=matching?.dataset.jobId;
    if(!jobId)return;

    const hero=detail.querySelector('.tos-job-hero-card');
    if(!hero)return;
    const action=document.createElement('button');
    action.type='button';
    action.className='tos-job-detail-log-time';
    action.dataset.jobDetailLogTime=jobId;
    action.innerHTML='<span aria-hidden="true">+</span><strong>Log time</strong><small>Add hours to this job</small>';
    action.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTimeForJob(jobId,title);});
    hero.appendChild(action);
  }

  function openTimeForJob(jobId,title){
    if(!jobId)return;
    const payload={jobId,title:title||'Job',requestedAt:Date.now()};
    try{sessionStorage.setItem('tradeos:pending-job-time',JSON.stringify(payload));}catch(_){ }

    document.querySelector('.tos-job-detail')?.remove();
    document.querySelector('.tos-job-team-sheet')?.remove();
    document.body.classList.remove('tos-job-detail-open','tos-job-team-open');

    const nav=document.querySelector('[data-nav="timesheets"]');
    if(nav){nav.click();schedule();}
    else showToast('Open Timesheets to add time to this job.');
  }

  function pending(){
    try{
      const raw=sessionStorage.getItem('tradeos:pending-job-time');
      if(!raw)return null;
      const value=JSON.parse(raw);
      if(!value?.jobId)return null;
      if(Date.now()-Number(value.requestedAt||0)>120000){sessionStorage.removeItem('tradeos:pending-job-time');return null;}
      return value;
    }catch(_){return null;}
  }

  function continuePendingTimeEntry(){
    const request=pending();
    if(!request)return;
    const active=document.querySelector('[data-nav="timesheets"].active');
    const shell=document.querySelector('.tos-ts');
    if(!active||!shell)return;

    const today=localIso(new Date());
    const todayButton=shell.querySelector(`[data-tos-date="${cssEsc(today)}"]`);
    if(todayButton&&!todayButton.classList.contains('active')){
      todayButton.click();
      return;
    }

    let sheet=document.querySelector('.tos-sheet');
    if(!sheet){
      const add=shell.querySelector('#tos-add');
      if(!add)return;
      if(add.disabled){
        clearPending();
        showToast('This week is approved. Reopen it before adding time.');
        return;
      }
      add.click();
      return;
    }

    if(sheet.dataset.jobShortcutHandled==='1')return;
    const select=sheet.querySelector('select[name="job"]');
    if(!select)return;
    const option=[...select.options].find(o=>o.value===request.jobId);
    if(!option){
      clearPending();
      showToast(`${request.title||'This job'} is not available on your timesheet.`);
      return;
    }
    select.value=request.jobId;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    sheet.dataset.jobShortcutHandled='1';
    clearPending();
    const start=sheet.querySelector('input[name="startTime"]');
    if(start){setTimeout(()=>{try{start.focus({preventScroll:true});}catch(_){start.focus();}},80);}
  }

  function clearPending(){try{sessionStorage.removeItem('tradeos:pending-job-time');}catch(_){ }}

  function showToast(text){
    document.querySelector('.tos-job-time-toast')?.remove();
    const toast=document.createElement('div');
    toast.className='tos-job-time-toast';
    toast.textContent=text;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),2600);
  }

  function localIso(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function cssEsc(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  schedule();
})();