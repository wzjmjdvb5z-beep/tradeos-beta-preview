(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  let currentJobId=null;
  let queued=false;
  let context=null;
  let profitability=null;
  let loadingProfitability=null;

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

  function privileged(m){
    return ['owner','admin','manager'].includes(String(m?.role||'').toLowerCase());
  }

  function pricingAllowed(m){
    return privileged(m)||m?.can_view_pricing===true;
  }

  async function loadProfitability(companyId){
    if(profitability)return profitability;
    if(loadingProfitability)return loadingProfitability;
    loadingProfitability=(async()=>{
      const {data,error}=await client.rpc('get_job_profitability',{target_company:companyId});
      if(error)throw error;
      profitability=data||[];
      loadingProfitability=null;
      return profitability;
    })().catch(err=>{loadingProfitability=null;throw err;});
    return loadingProfitability;
  }

  async function enhance(){
    const ctx=await getContext();
    if(!ctx)return;
    const allowed=pricingAllowed(ctx.membership);

    if(!allowed){
      document.querySelectorAll('.tos-secure-finance-line').forEach(el=>el.remove());
      const metrics=document.querySelector('.tos-job-detail .tos-job-metrics');
      const valueBlock=metrics?[...metrics.children].find(el=>el.querySelector('span')?.textContent?.trim()==='Value'):null;
      if(valueBlock){valueBlock.hidden=true;valueBlock.setAttribute('aria-hidden','true');}
      return;
    }

    const rows=await loadProfitability(ctx.companyId);
    enhanceJobList(rows,ctx.membership);
    enhanceJobDetail(rows);
  }

  function enhanceJobList(rows,membership){
    if(privileged(membership))return;
    document.querySelectorAll('.jobs-list-clean .item[data-job-id], .jobs-clean-page .item[data-job-id]').forEach(card=>{
      if(card.querySelector('.tos-secure-finance-line'))return;
      const row=rows.find(x=>x.job_id===card.dataset.jobId);
      const main=card.querySelector('.item-main');
      if(!row||!main)return;
      const line=document.createElement('small');
      line.className='tos-secure-finance-line';
      line.textContent=`Net value ${gbp.format(Number(row.agreed_value||0))} · Actual profit ${gbp.format(Number(row.gross_profit||0))}`;
      main.appendChild(line);
    });
  }

  function enhanceJobDetail(rows){
    const metrics=document.querySelector('.tos-job-detail .tos-job-metrics');
    if(!metrics)return;
    const valueBlock=[...metrics.children].find(el=>el.querySelector('span')?.textContent?.trim()==='Value');
    if(!valueBlock)return;
    valueBlock.hidden=false;
    valueBlock.removeAttribute('aria-hidden');
    if(!currentJobId||valueBlock.dataset.secureJobValue===currentJobId)return;
    const row=rows.find(x=>x.job_id===currentJobId);
    if(!row)return;
    const strong=valueBlock.querySelector('strong');
    if(strong)strong.textContent=gbp.format(Number(row.agreed_value||0));
    valueBlock.dataset.secureJobValue=currentJobId;
  }

  document.addEventListener('click',e=>rememberJob(e.target),true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' ')rememberJob(e.target);
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.id==='company'){
      context=null;currentJobId=null;profitability=null;loadingProfitability=null;queue();
    }
  });
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();
