(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  let currentJobId=null;
  let queued=false;
  let context=null;

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance().catch(()=>{});});
  }

  function rememberJob(target){
    const card=target?.closest?.('.job-detail-list-card[data-job-id]');
    if(card?.dataset.jobId){currentJobId=card.dataset.jobId;queue();}
  }

  async function getContext(){
    if(context)return context;
    const {data:{user}}=await client.auth.getUser();
    if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null;
    let membership=null;
    if(companyId){
      const r=await client.from('company_members')
        .select('company_id,role,active,can_view_pricing')
        .eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      membership=r.data||null;
    }
    if(!membership){
      const r=await client.from('company_members')
        .select('company_id,role,active,can_view_pricing')
        .eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      membership=r.data||null;
      companyId=membership?.company_id||null;
    }
    if(!membership||!companyId)return null;
    context={companyId,membership};
    return context;
  }

  function pricingAllowed(m){
    return ['owner','admin','manager'].includes(String(m?.role||'').toLowerCase())||m?.can_view_pricing===true;
  }

  async function enhance(){
    const metrics=document.querySelector('.tos-job-detail .tos-job-metrics');
    if(!metrics)return;
    const valueBlock=[...metrics.children].find(el=>el.querySelector('span')?.textContent?.trim()==='Value');
    if(!valueBlock)return;

    const ctx=await getContext();
    if(!ctx)return;
    if(!pricingAllowed(ctx.membership)){
      valueBlock.hidden=true;
      valueBlock.setAttribute('aria-hidden','true');
      return;
    }

    valueBlock.hidden=false;
    valueBlock.removeAttribute('aria-hidden');
    if(!currentJobId||valueBlock.dataset.secureJobValue===currentJobId)return;

    const {data,error}=await client.rpc('get_job_profitability',{target_company:ctx.companyId});
    if(error)return;
    const row=(data||[]).find(x=>x.job_id===currentJobId);
    if(!row)return;
    const strong=valueBlock.querySelector('strong');
    if(strong)strong.textContent=gbp.format(Number(row.agreed_value||0));
    valueBlock.dataset.secureJobValue=currentJobId;
  }

  document.addEventListener('click',e=>rememberJob(e.target),true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' ')rememberJob(e.target);
  },true);
  document.addEventListener('change',e=>{if(e.target?.id==='company'){context=null;currentJobId=null;queue();}});
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();
