(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  const managerRoles=new Set(['owner','admin','manager']);
  const CHECKOUT_FUNCTION='create-billing-checkout';
  let queued=false;
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z"/><path d="M4 10h16M8 14h4"/></svg>';

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function pretty(v){return String(v||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mountMore();});}

  async function context(){
    const {data:{user}}=await client.auth.getUser();
    if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){
      const r=await client.from('company_members').select('company_id,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      membership=r.data;
    }
    if(!membership){
      const r=await client.from('company_members').select('company_id,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      membership=r.data;companyId=membership?.company_id||null;
    }
    return membership&&companyId?{user,companyId,membership}:null;
  }

  async function billingFor(companyId){
    let r=await client.rpc('get_company_billing_v2',{target_company:companyId});
    if(r.error&&/get_company_billing_v2/i.test(r.error.message||''))r=await client.rpc('get_company_billing',{target_company:companyId});
    if(r.error)throw r.error;
    return (Array.isArray(r.data)?r.data[0]:r.data)||{};
  }

  async function mountMore(){
    const list=document.querySelector('.modern-more-list');
    if(!list)return;
    const existing=[...list.querySelectorAll('[data-tradeos-billing]')];
    if(existing.length>1)existing.slice(1).forEach(x=>x.remove());
    if(existing.length||list.dataset.billingMounting==='1')return;
    list.dataset.billingMounting='1';
    try{
      const ctx=await context();
      if(!ctx||!managerRoles.has(ctx.membership.role)||!list.isConnected)return;
      if(list.querySelector('[data-tradeos-billing]'))return;
      let subtitle='Veystead · from £19/month';
      try{
        const b=await billingFor(ctx.companyId);
        if(b.status==='trialing')subtitle=`Veystead · ${Number(b.days_remaining||0)} days left in trial`;
        if(b.status==='active')subtitle='Veystead · Active';
        if(b.status==='past_due')subtitle='Payment needs attention';
        if(b.status==='canceled')subtitle='Subscription canceled';
      }catch(_){ }
      const btn=document.createElement('button');
      btn.type='button';btn.className='modern-more-item';btn.dataset.tradeosBilling='1';
      btn.innerHTML=`<span class="modern-more-icon">${icon}</span><span><strong>Plan & billing</strong><small>${esc(subtitle)}</small></span>`;
      btn.addEventListener('click',()=>{document.querySelector('.modern-more-sheet')?.remove();openBilling();});
      const signout=list.querySelector('[data-modern-signout]');
      list.insertBefore(btn,signout||null);
    }finally{delete list.dataset.billingMounting;}
  }

  async function createCheckout(companyId){
    const {data,error}=await client.functions.invoke(CHECKOUT_FUNCTION,{body:{company_id:companyId}});
    if(error)throw error;
    if(!data?.url)throw new Error(data?.error||'Checkout is temporarily unavailable.');
    return data.url;
  }

  async function checkoutReady(companyId){
    const {data,error}=await client.functions.invoke(CHECKOUT_FUNCTION,{body:{company_id:companyId,action:'status'}});
    return !error&&data?.ready===true;
  }

  async function openBilling(){
    document.querySelector('.tos-billing-sheet')?.remove();
    const ctx=await context();
    if(!ctx||!managerRoles.has(ctx.membership.role))return;

    const [billingRes,companyRes,ready]=await Promise.all([
      client.rpc('get_company_billing_v2',{target_company:ctx.companyId}),
      client.from('companies').select('name').eq('id',ctx.companyId).single(),
      checkoutReady(ctx.companyId)
    ]);
    if(billingRes.error){toast(billingRes.error.message);return;}

    const b=(Array.isArray(billingRes.data)?billingRes.data[0]:billingRes.data)||{};
    const companyName=companyRes.data?.name||'Your business';
    const status=String(b.status||'trialing');
    const days=Number(b.days_remaining||0);
    const active=status==='active';
    const trial=status==='trialing';
    const subscribed=Boolean(b.has_subscription);
    const basePence=Number(b.price_pence||1900);
    const seatPence=Number(b.seat_price_pence||799);
    const activeUsers=Math.max(1,Number(b.active_user_count||1));
    const additionalUsers=Math.max(0,Number(b.additional_user_count??activeUsers-1));
    const monthlyPence=Number(b.monthly_total_pence||basePence+(additionalUsers*seatPence));
    const price=(basePence/100).toFixed(0);
    const seatPrice=(seatPence/100).toFixed(2);
    const monthly=(monthlyPence/100).toFixed(2);
    const trialCopy=trial?`${days} day${days===1?'':'s'} remaining`:(active?'Subscription active':pretty(status));

    const o=document.createElement('div');
    o.className='tos-billing-sheet';
    o.innerHTML=`<div class="tos-billing-panel" role="dialog" aria-modal="true" aria-label="Plan and billing">
      <div class="tos-billing-handle"></div>
      <div class="tos-billing-head"><div><span>VEYSTEAD PLAN</span><h3>Veystead</h3><p>${esc(companyName)}</p></div><button type="button" class="tos-billing-close" aria-label="Close">×</button></div>
      <div class="tos-billing-status ${esc(status)}"><span>${esc(trialCopy)}</span><strong>£${monthly}<small>/month</small></strong></div>
      <div class="tos-billing-founder"><strong>Simple pricing that grows with your team</strong><p>£${price}/month includes the owner, then £${seatPrice} for each additional active user. Your current total is based on ${activeUsers} active user${activeUsers===1?'':'s'}.</p></div>
      <div class="tos-billing-card"><h4>Everything you need to run the job</h4><div class="tos-billing-features"><span>✓ Jobs, team & scheduling</span><span>✓ Timesheets & job time</span><span>✓ Quotes & invoices</span><span>✓ Job profitability</span><span>✓ Customer quote/invoice links</span><span>✓ Job notes & photos</span></div></div>
      <div class="tos-billing-founder"><strong>Cancel anytime</strong><p>There are no staff bands or long contract. Inactive users are not included in the next calculated seat total.</p></div>
      ${active||subscribed?`<button type="button" class="tos-billing-cta" disabled>${active?'Plan active':'Trial active'}</button>`:ready?'<button type="button" class="tos-billing-cta">Start 14-day trial</button>':'<button type="button" class="tos-billing-cta" disabled>Secure checkout being connected</button>'}
      ${!active&&!subscribed?(ready?'<p class="tos-billing-pending">Stripe will collect payment details now. Your first charge is after the remaining trial period.</p>':'<p class="tos-billing-pending">Your Veystead trial remains available. Payment details cannot be collected until the secure Stripe connection is finished.</p>'):''}
    </div>`;

    document.body.appendChild(o);
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const close=()=>{o.remove();document.body.style.overflow=previousOverflow;};
    o.querySelector('.tos-billing-close')?.addEventListener('click',close);
    o.addEventListener('click',e=>{if(e.target===o)close();});
    if(!active&&!subscribed&&ready)o.querySelector('.tos-billing-cta')?.addEventListener('click',async e=>{
      const button=e.currentTarget;button.disabled=true;button.textContent='Opening secure checkout…';
      try{window.location.assign(await createCheckout(ctx.companyId));}
      catch(err){button.disabled=false;button.textContent='Start 14-day trial';toast(err?.message||'Checkout is temporarily unavailable.');}
    });
  }

  function toast(m){
    document.querySelector('.tos-billing-toast')?.remove();
    const t=document.createElement('div');t.className='tos-billing-toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);
  }

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
