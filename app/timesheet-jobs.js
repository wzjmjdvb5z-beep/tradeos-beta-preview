(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let loading=false;
  let loadedCompany=null;

  async function refreshJobSource(force=false){
    if(!client||loading)return;
    loading=true;
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user)return;

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
      const companyId=membership.company_id;
      if(!force&&loadedCompany===companyId&&document.querySelector('#tos-permitted-job-source'))return;

      let jobs=[];
      if(['owner','admin','manager'].includes(membership.role)){
        const {data,error}=await client
          .from('jobs')
          .select('id,title,status,created_at')
          .eq('company_id',companyId)
          .order('created_at',{ascending:false})
          .limit(300);
        if(error)throw error;
        jobs=data||[];
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
          jobs=data||[];
        }
      }

      // Keep the most relevant jobs first, but leave completed jobs available for corrections.
      const rank=status=>{
        const s=String(status||'').toLowerCase();
        if(/in.?progress|active/.test(s))return 0;
        if(/booked|scheduled|open/.test(s))return 1;
        if(/complete|done/.test(s))return 3;
        return 2;
      };
      jobs.sort((a,b)=>rank(a.status)-rank(b.status)||String(a.title||'').localeCompare(String(b.title||'')));
      inject(jobs,companyId);
      loadedCompany=companyId;
    }catch(err){
      console.warn('TradeOS job picker refresh failed',err);
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

  document.addEventListener('change',e=>{
    if(e.target?.id==='company')setTimeout(()=>refreshJobSource(true),0);
  },true);

  // Run after the core app starts, then retry once in case its first render is still loading.
  const start=()=>{
    refreshJobSource(true);
    setTimeout(()=>refreshJobSource(true),900);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
