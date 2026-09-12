(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false,busy=false,lastCompany=null;

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;hydrate().catch(()=>{});});
  }

  async function context(){
    const {data:{user}}=await client.auth.getUser();
    if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null;
    let me=null;
    if(companyId){
      const r=await client.from('company_members').select('company_id,role').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      me=r.data||null;
    }
    if(!me){
      const r=await client.from('company_members').select('company_id,role').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      me=r.data||null;companyId=me?.company_id||null;
    }
    return me&&companyId?{user,companyId,role:me.role}:null;
  }

  async function hydrate(){
    if(busy||!document.querySelector('[data-nav="team"].active'))return;
    busy=true;
    try{
      const ctx=await context();
      if(!ctx||!['owner','admin','manager'].includes(ctx.role))return;
      lastCompany=ctx.companyId;
      const [ratesResult,membersResult,sheetsResult]=await Promise.all([
        client.rpc('get_member_cost_rates',{target_company:ctx.companyId}),
        client.from('company_members').select('id,user_id,full_name,role').eq('company_id',ctx.companyId).eq('active',true),
        client.from('weekly_timesheets').select('id,user_id,week_start,status,weekly_time_entries(hours)').eq('company_id',ctx.companyId).eq('status','submitted')
      ]);
      if(ratesResult.error)throw ratesResult.error;
      const rates=ratesResult.data||[];
      const members=membersResult.data||[];
      const sheets=sheetsResult.data||[];
      const byMember=new Map(rates.map(r=>[r.member_id,r.hourly_cost]));
      const byUser=new Map(rates.map(r=>[r.user_id,r.hourly_cost]));

      document.querySelectorAll('[data-rate-input]').forEach(input=>{
        const rate=byMember.get(input.dataset.rateInput);
        if(document.activeElement!==input)input.value=rate==null?'':cleanRate(rate);
      });
      document.querySelectorAll('[data-cost]').forEach(input=>{
        const rate=byMember.get(input.dataset.cost);
        if(document.activeElement!==input)input.value=rate==null?'':cleanRate(rate);
      });

      document.querySelectorAll('[data-review]').forEach(button=>{
        const sheet=sheets.find(s=>s.id===button.dataset.review);
        if(!sheet)return;
        const member=members.find(m=>m.user_id===sheet.user_id);
        const rate=Number(byUser.get(sheet.user_id));
        if(!Number.isFinite(rate))return;
        const hours=(sheet.weekly_time_entries||[]).reduce((sum,e)=>sum+Number(e.hours||0),0);
        const item=button.closest('.item');
        if(!item)return;
        const small=[...item.querySelectorAll('.item-main small')].find(x=>/Week\s/i.test(x.textContent||''));
        if(small)small.textContent=`Week ${sheet.week_start} · ${formatHours(hours)} hours · £${rate.toFixed(2)}/hr`;
        let cost=item.querySelector('.tos-review-cost');
        if(!cost){cost=document.createElement('small');cost.className='tos-review-cost';small?.insertAdjacentElement('afterend',cost);}
        if(cost)cost.textContent=`Estimated labour cost on approval: £${(hours*rate).toFixed(2)}`;
        if(member?.full_name){const strong=item.querySelector('.item-main strong');if(strong)strong.textContent=member.full_name;}
      });
    }finally{busy=false;}
  }

  function cleanRate(v){const n=Number(v);return Number.isFinite(n)?n.toFixed(2).replace(/\.00$/,''):'';}
  function formatHours(v){const n=Number(v||0);return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');}

  document.addEventListener('click',e=>{
    if(e.target?.matches?.('[data-rate-save],[data-save-cost]'))setTimeout(schedule,450);
  },true);
  document.addEventListener('change',e=>{if(e.target?.id==='company'){lastCompany=null;schedule();}});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
