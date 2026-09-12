(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let observer=null;
  let enhancing=false;
  let scrollLock=null;

  function start(){
    observer=new MutationObserver(()=>enhance());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('pageshow',()=>{if(!document.querySelector('.tos-job-picker-sheet'))forceUnlockBackground();});
    enhance();
  }

  function enhance(){
    if(enhancing)return;
    enhancing=true;
    requestAnimationFrame(()=>{
      enhancing=false;
      const selects=[
        ...document.querySelectorAll('#tos-timer-job'),
        ...document.querySelectorAll('#tos-block-form select[name="job"]')
      ];
      selects.forEach(enhanceSelect);
    });
  }

  function enhanceSelect(select){
    if(!select||select.dataset.searchPicker==='1')return;
    select.dataset.searchPicker='1';
    const button=document.createElement('button');
    button.type='button';
    button.className='tos-job-picker-button';
    button.setAttribute('aria-haspopup','dialog');
    button.innerHTML=`<span class="tos-job-picker-copy"><strong>${esc(currentTitle(select))}</strong><small>Tap to search jobs</small></span><span class="tos-job-picker-chevron">⌄</span>`;
    select.style.display='none';
    select.insertAdjacentElement('afterend',button);
    button.addEventListener('click',()=>openPicker(select,button));
    select.addEventListener('change',()=>updateButton(select,button));
  }

  function updateButton(select,button){
    const strong=button?.querySelector('strong');
    if(strong)strong.textContent=currentTitle(select);
  }

  function currentTitle(select){
    return select?.selectedOptions?.[0]?.textContent?.trim()||'Choose a job';
  }

  function lockBackground(){
    if(scrollLock)return;
    const body=document.body,html=document.documentElement;
    const y=window.scrollY||html.scrollTop||0;
    scrollLock={
      y,
      body:{position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,overflow:body.style.overflow},
      htmlOverflow:html.style.overflow
    };
    body.classList.add('tos-job-picker-open');
    body.style.position='fixed';
    body.style.top=`-${y}px`;
    body.style.left='0';
    body.style.right='0';
    body.style.width='100%';
    body.style.overflow='hidden';
    html.style.overflow='hidden';
  }

  function unlockBackground(){
    if(!scrollLock)return;
    const body=document.body,html=document.documentElement;
    const saved=scrollLock;
    scrollLock=null;
    body.style.position=saved.body.position;
    body.style.top=saved.body.top;
    body.style.left=saved.body.left;
    body.style.right=saved.body.right;
    body.style.width=saved.body.width;
    body.style.overflow=saved.body.overflow;
    html.style.overflow=saved.htmlOverflow;
    body.classList.remove('tos-job-picker-open');
    requestAnimationFrame(()=>window.scrollTo(0,saved.y));
  }

  function forceUnlockBackground(){
    if(scrollLock)unlockBackground();
    else document.body.classList.remove('tos-job-picker-open');
  }

  async function openPicker(select,button){
    const existing=document.querySelector('.tos-job-picker-sheet');
    if(existing){existing.remove();forceUnlockBackground();}
    const overlay=document.createElement('div');
    overlay.className='tos-job-picker-sheet';
    overlay.innerHTML=`<div class="tos-job-picker-panel" role="dialog" aria-modal="true" aria-label="Choose job">
      <div class="tos-job-picker-handle"></div>
      <div class="tos-job-picker-head"><div><p class="eyebrow">CHOOSE JOB</p><h3>Select a job</h3></div><button class="tos-job-picker-close" type="button" aria-label="Close">×</button></div>
      <div class="tos-job-search-wrap"><span class="tos-job-search-icon">⌕</span><input id="tos-job-search" type="search" inputmode="search" autocomplete="off" placeholder="Search jobs…" aria-label="Search jobs"></div>
      <div class="tos-job-picker-results"><div class="tos-job-picker-loading">Loading jobs…</div></div>
    </div>`;
    document.body.appendChild(overlay);
    lockBackground();
    const search=overlay.querySelector('#tos-job-search');
    const results=overlay.querySelector('.tos-job-picker-results');
    let closed=false;
    const close=()=>{
      if(closed)return;
      closed=true;
      overlay.remove();
      unlockBackground();
    };
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('.tos-job-picker-close')?.addEventListener('click',close);

    let jobs=[];
    try{
      jobs=await loadJobs(select);
      syncSelect(select,jobs);
      updateButton(select,button);
      renderResults(results,jobs,select.value,close,select,button,'');
    }catch(err){
      jobs=[...select.options].filter(o=>o.value).map(o=>({id:o.value,title:o.textContent||'Job',status:'',last_used:null}));
      renderResults(results,jobs,select.value,close,select,button,'');
    }

    search.addEventListener('input',()=>renderResults(results,jobs,select.value,close,select,button,search.value));
    setTimeout(()=>{if(!closed&&overlay.isConnected)search.focus();},80);
  }

  async function loadJobs(select){
    let companyId=null;
    const shared=Array.isArray(window.TradeOSTimesheetJobs)?window.TradeOSTimesheetJobs:[];
    if(shared[0]?.company_id)companyId=shared[0].company_id;
    if(!companyId&&select?.value){
      const {data}=await client.from('jobs').select('company_id').eq('id',select.value).maybeSingle();
      companyId=data?.company_id||null;
    }
    const {data,error}=await client.rpc('list_timesheet_jobs_v3',{target_company:companyId});
    if(error)throw error;
    return (data||[]).map(j=>({
      company_id:j.company_id,
      id:j.id,
      title:j.title||'Untitled job',
      status:j.status||'',
      last_used:j.last_used||null
    }));
  }

  function syncSelect(select,jobs){
    const previous=select.value;
    select.innerHTML='';
    jobs.forEach(job=>{
      const option=document.createElement('option');
      option.value=job.id;
      option.textContent=job.title;
      select.appendChild(option);
    });
    if(previous&&jobs.some(j=>j.id===previous))select.value=previous;
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function renderResults(container,jobs,currentId,close,select,button,query){
    const q=String(query||'').trim().toLowerCase();
    const filtered=q?jobs.filter(j=>`${j.title} ${j.status}`.toLowerCase().includes(q)):jobs;
    if(!filtered.length){
      container.innerHTML='<div class="tos-job-picker-empty">No matching jobs.</div>';
      return;
    }

    const recent=!q?filtered.filter(j=>j.last_used).slice(0,5):[];
    const recentIds=new Set(recent.map(j=>j.id));
    const rest=!q?filtered.filter(j=>!recentIds.has(j.id)):filtered;
    let html='';
    if(recent.length){
      html+='<div class="tos-job-picker-section">Recent</div>';
      html+=recent.map(j=>jobRow(j,currentId,true)).join('');
    }
    if(rest.length){
      if(!q)html+='<div class="tos-job-picker-section">All jobs</div>';
      html+=rest.map(j=>jobRow(j,currentId,false)).join('');
    }
    container.innerHTML=html;
    container.querySelectorAll('[data-job-choice]').forEach(row=>row.addEventListener('click',()=>{
      const id=row.dataset.jobChoice;
      if(!id)return;
      select.value=id;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      updateButton(select,button);
      close();
    }));
  }

  function jobRow(job,currentId,isRecent){
    const selected=job.id===currentId;
    const meta=[];
    if(isRecent&&job.last_used)meta.push(`Used ${formatDate(job.last_used)}`);
    if(job.status)meta.push(prettyStatus(job.status));
    return `<button type="button" class="tos-job-choice ${selected?'selected':''}" data-job-choice="${esc(job.id)}">
      <span class="tos-job-choice-main"><strong>${esc(job.title)}</strong>${meta.length?`<small>${esc(meta.join(' · '))}</small>`:''}</span>
      <span class="tos-job-choice-check">${selected?'✓':''}</span>
    </button>`;
  }

  function formatDate(iso){
    const [y,m,d]=String(iso).split('-').map(Number);
    if(!y||!m||!d)return'';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(y,m-1,d,12));
  }
  function prettyStatus(v){return String(v||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();