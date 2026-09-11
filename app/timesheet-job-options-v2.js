(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let jobs=[];
  let loading=false;
  let loadedCompany=null;
  let queued=false;

  const isManagerRole=role=>['owner','admin','manager'].includes(String(role||'').toLowerCase());
  const rank=status=>{
    const s=String(status||'').toLowerCase();
    if(/in.?progress|active/.test(s))return 0;
    if(/booked|scheduled|open/.test(s))return 1;
    if(/complete|done/.test(s))return 3;
    return 2;
  };

  async function loadJobs(force=false){
    if(loading)return;
    loading=true;
    try{
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError||!user)return;

      const {data:memberships,error:memberError}=await client
        .from('company_members')
        .select('id,company_id,role,active,created_at')
        .eq('user_id',user.id)
        .eq('active',true)
        .order('created_at',{ascending:true});
      if(memberError)throw memberError;
      if(!memberships?.length)return;

      const selectedCompany=document.querySelector('#company')?.value||null;
      const membership=memberships.find(m=>m.company_id===selectedCompany)||memberships[0];
      if(!membership)return;
      const companyId=membership.company_id;
      if(!force&&loadedCompany===companyId&&jobs.length){applyOptions();return;}

      let nextJobs=[];
      if(isManagerRole(membership.role)){
        const {data,error}=await client
          .from('jobs')
          .select('id,title,status,created_at')
          .eq('company_id',companyId)
          .order('created_at',{ascending:false})
          .limit(500);
        if(error)throw error;
        nextJobs=data||[];
      }else{
        const {data:assignments,error:assignmentError}=await client
          .from('job_assignments')
          .select('job_id')
          .eq('company_id',companyId)
          .eq('member_id',membership.id)
          .limit(500);
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
          nextJobs=data||[];
        }
      }

      nextJobs.sort((a,b)=>rank(a.status)-rank(b.status)||String(a.title||'').localeCompare(String(b.title||'')));
      jobs=nextJobs;
      loadedCompany=companyId;
      window.TradeOSTimesheetJobs=jobs.map(j=>({id:j.id,title:j.title,status:j.status}));
      window.dispatchEvent(new CustomEvent('tradeos:timesheet-jobs',{detail:{companyId,count:jobs.length}}));
      applyOptions();
    }catch(err){
      console.warn('TradeOS direct Timesheets job load failed',err);
      showPickerError('Could not refresh the job list. Try reopening Timesheets.');
    }finally{
      loading=false;
    }
  }

  function applyOptions(){
    if(!jobs.length)return;
    const selects=[
      ...document.querySelectorAll('#tos-timer-job'),
      ...document.querySelectorAll('#tos-block-form select[name="job"]')
    ];
    selects.forEach(select=>{
      const previous=select.value;
      const existing=[...select.options].map(o=>o.value).filter(Boolean);
      const wanted=jobs.map(j=>j.id);
      const same=existing.length===wanted.length&&existing.every((id,i)=>id===wanted[i]);
      if(!same){
        select.innerHTML='';
        jobs.forEach(job=>{
          const option=document.createElement('option');
          option.value=job.id;
          option.textContent=job.title||'Untitled job';
          select.appendChild(option);
        });
      }
      if(previous&&jobs.some(j=>j.id===previous))select.value=previous;
      select.disabled=false;
      select.dataset.liveJobs=String(jobs.length);
    });

    const timerLabel=document.querySelector('.tos-live-field label');
    if(timerLabel&&document.querySelector('#tos-timer-job'))timerLabel.textContent=`Job · ${jobs.length} available`;
  }

  function showPickerError(message){
    const box=document.querySelector('#tos-live-message');
    if(box&&!box.textContent.trim())box.innerHTML=`<div class="tos-live-message error">${escapeHtml(message)}</div>`;
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function queueApply(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;applyOptions();});
  }

  new MutationObserver(mutations=>{
    let relevant=false;
    for(const m of mutations){
      if(m.addedNodes?.length){relevant=true;break;}
    }
    if(relevant)queueApply();
  }).observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('change',e=>{
    if(e.target?.id==='company')setTimeout(()=>loadJobs(true),0);
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-nav="timesheets"],#tos-add,[data-entry-id]'))setTimeout(()=>loadJobs(true),30);
  },true);

  const start=()=>{
    loadJobs(true);
    setTimeout(()=>loadJobs(true),600);
    setTimeout(()=>loadJobs(true),1600);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
