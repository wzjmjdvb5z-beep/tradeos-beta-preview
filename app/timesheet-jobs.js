(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let loading=false;
  let loadedCompany=null;
  let cachedJobs=[];
  let applyQueued=false;
  const entryJobMap=new Map();

  async function refreshJobSource(force=false){
    if(!client)return cachedJobs;
    if(loading)return cachedJobs;
    loading=true;
    try{
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError||!user)return cachedJobs;

      const {data:memberships,error:memberError}=await client
        .from('company_members')
        .select('id,company_id,role,active,created_at')
        .eq('user_id',user.id)
        .eq('active',true)
        .order('created_at',{ascending:true});
      if(memberError)throw memberError;
      if(!memberships?.length)return [];

      const selectedCompany=document.querySelector('#company')?.value||null;
      const membership=memberships.find(m=>m.company_id===selectedCompany)||memberships[0];
      const companyId=membership.company_id;

      if(!force&&loadedCompany===companyId&&cachedJobs.length){
        applyAll();
        return cachedJobs;
      }

      let jobs=[];
      if(['owner','admin','manager'].includes(String(membership.role||'').toLowerCase())){
        const {data,error}=await client
          .from('jobs')
          .select('id,title,status,created_at')
          .eq('company_id',companyId)
          .order('created_at',{ascending:false})
          .limit(500);
        if(error)throw error;
        jobs=data||[];
      }else{
        const {data:assignments,error:assignmentError}=await client
          .from('job_assignments')
          .select('job_id')
          .eq('company_id',companyId)
          .eq('member_id',membership.id)
          .limit(1000);
        if(assignmentError)throw assignmentError;
        const ids=[...new Set((assignments||[]).map(a=>a.job_id).filter(Boolean))];
        if(ids.length){
          const {data,error}=await client
            .from('jobs')
            .select('id,title,status,created_at')
            .eq('company_id',companyId)
            .in('id',ids)
            .order('created_at',{ascending:false});
          if(error)throw error;
          jobs=data||[];
        }
      }

      const rank=status=>{
        const s=String(status||'').toLowerCase();
        if(/in.?progress|active/.test(s))return 0;
        if(/booked|scheduled|open/.test(s))return 1;
        if(/complete|done/.test(s))return 3;
        return 2;
      };
      jobs.sort((a,b)=>rank(a.status)-rank(b.status)||String(a.title||'').localeCompare(String(b.title||'')));
      cachedJobs=jobs;
      loadedCompany=companyId;
      inject(jobs,companyId);
      applyAll();
      document.dispatchEvent(new CustomEvent('tradeos:jobs-updated',{detail:{companyId,jobs:jobs.map(j=>({...j}))}}));
      return jobs;
    }catch(err){
      console.warn('TradeOS job picker refresh failed',err);
      return cachedJobs;
    }finally{
      loading=false;
    }
  }

  function inject(jobs,companyId){
    document.querySelector('#tos-permitted-job-source')?.remove();
    const table=document.createElement('table');
    table.id='tos-permitted-job-source';
    table.hidden=true;
    table.setAttribute('aria-hidden','true');
    table.dataset.companyId=companyId;
    const body=document.createElement('tbody');
    jobs.forEach(job=>{
      const row=document.createElement('tr');
      const title=document.createElement('td');
      title.className='job-col';
      const strong=document.createElement('strong');
      strong.textContent=job.title||'Untitled job';
      title.appendChild(strong);
      const cell=document.createElement('td');
      const marker=document.createElement('input');
      marker.type='hidden';
      marker.dataset.hourJob=job.id;
      cell.appendChild(marker);
      row.append(title,cell);
      body.appendChild(row);
    });
    table.appendChild(body);
    document.body.appendChild(table);
  }

  function queueApply(){
    if(applyQueued)return;
    applyQueued=true;
    requestAnimationFrame(()=>{
      applyQueued=false;
      applyAll();
    });
  }

  function applyAll(){
    if(!cachedJobs.length)return;
    document.querySelectorAll('#tos-timer-job,.tos-sheet select[name="job"],#tos-block-form select[name="job"]').forEach(applySelect);
    decorateEntries();
  }

  function applySelect(select){
    if(!select||!cachedJobs.length)return;
    const current=String(select.value||'');
    const currentOption=[...select.options].find(o=>o.value===current);
    const currentLabel=currentOption?.textContent?.trim()||'Current job';
    const sig=`${loadedCompany||''}:${cachedJobs.map(j=>j.id).join(',')}`;
    if(select.dataset.tradeosJobsSig===sig&&[...select.options].some(o=>o.value===current))return;

    const options=[];
    if(current&&!cachedJobs.some(j=>j.id===current)){
      options.push(`<option value="${esc(current)}" selected>${esc(currentLabel)} (existing)</option>`);
    }
    for(const job of cachedJobs){
      options.push(`<option value="${esc(job.id)}" ${job.id===current?'selected':''}>${esc(job.title||'Untitled job')}</option>`);
    }
    select.innerHTML=options.join('');
    if(current&&[...select.options].some(o=>o.value===current))select.value=current;
    else if(cachedJobs[0])select.value=cachedJobs[0].id;
    select.dataset.tradeosJobsSig=sig;
  }

  async function decorateEntries(){
    const cards=[...document.querySelectorAll('.tos-entry-card')];
    if(!cards.length)return;
    const ids=cards.map(card=>card.querySelector('[data-entry-id]')?.dataset.entryId).filter(Boolean);
    const missing=ids.filter(id=>!entryJobMap.has(id));
    if(missing.length){
      try{
        const {data,error}=await client.from('weekly_time_entries').select('id,job_id').in('id',missing);
        if(!error)(data||[]).forEach(row=>entryJobMap.set(row.id,row.job_id));
      }catch{}
    }
    const jobsById=new Map(cachedJobs.map(j=>[j.id,j]));
    cards.forEach(card=>{
      const entryId=card.querySelector('[data-entry-id]')?.dataset.entryId;
      const jobId=entryJobMap.get(entryId);
      const job=jobsById.get(jobId);
      const title=card.querySelector('.tos-entry-main strong');
      if(job&&title)title.textContent=job.title||'Untitled job';
    });
  }

  document.addEventListener('change',e=>{
    if(e.target?.id==='company')setTimeout(()=>refreshJobSource(true),0);
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-nav="timesheets"]'))setTimeout(()=>refreshJobSource(true),80);
    if(e.target?.closest?.('#tos-add,[data-entry-id]'))setTimeout(queueApply,30);
  },true);

  document.addEventListener('tradeos:time-entry-saved',()=>{
    entryJobMap.clear();
    setTimeout(()=>{refreshJobSource(true);queueApply();},80);
  });

  new MutationObserver(queueApply).observe(document.documentElement,{childList:true,subtree:true});

  window.TradeOSJobSource={
    refresh:(force=true)=>refreshJobSource(force),
    get:async(force=false)=>{await refreshJobSource(force);return cachedJobs.map(j=>({...j}));},
    peek:()=>cachedJobs.map(j=>({...j}))
  };

  const start=()=>{
    refreshJobSource(true);
    setTimeout(()=>refreshJobSource(true),700);
    setTimeout(()=>refreshJobSource(true),1800);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
