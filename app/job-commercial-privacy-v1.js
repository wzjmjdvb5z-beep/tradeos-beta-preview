(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  let activeJobId=null,queued=false;

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('[data-job-id]');
    if(card?.dataset?.jobId)activeJobId=card.dataset.jobId;
  },true);

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  async function enhance(){
    const page=document.querySelector('.tos-job-detail-page');
    const metrics=page?.querySelector('.tos-job-metrics');
    if(!page||!metrics||metrics.dataset.commercialPrivacy==='1'||!activeJobId)return;
    metrics.dataset.commercialPrivacy='1';
    const valueBlock=[...metrics.children].find(x=>x.querySelector('span')?.textContent?.trim()==='Value');
    if(!valueBlock)return;
    try{
      const {data,error}=await client.rpc('get_job_commercial_value',{target_job:activeJobId});
      if(error||data==null){valueBlock.remove();return;}
      const strong=valueBlock.querySelector('strong');
      if(strong)strong.textContent=money.format(Number(data)||0);
    }catch(_){valueBlock.remove();}
  }

  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  queue();
})();