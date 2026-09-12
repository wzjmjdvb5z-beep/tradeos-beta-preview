(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;
  const managerRoles=new Set(['owner','admin','manager']);
  let queued=false;
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z"/><path d="M4 10h16M8 14h4"/></svg>';

  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mountMore();});}
  async function context(){
    const {data:{user}}=await client.auth.getUser();if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){const r=await client.from('company_members').select('company_id,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();membership=r.data;}
    if(!membership){const r=await client.from('company_members').select('company_id,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();membership=r.data;companyId=membership?.company_id||null;}
    return membership&&companyId?{user,companyId,membership}:null;
  }

  async function mountMore(){
    const list=document.querySelector('.modern-more-list');if(!list)return;
    const existing=[...list.querySelectorAll('[data-tradeos-billing]')];
    if(existing.length>1)existing.slice(1).forEach(x=>x.remove());
    if(existing.length)return;
    if(list.dataset.billingMounting==='1')return;
    list.dataset.billingMounting='1';
    try{
      const ctx=await context();
      if(!ctx||!managerRoles.has(ctx.membership.role)||!list.isConnected)return;
      if(list.querySelector('[data-tradeos-billing]'))return;
      let subtitle='Founding Beta · £24/month';
      try{
        const r=await client.rpc('get_company_billing',{target_company:ctx.companyId});
        const b=Array.isArray(r.data)?r.data[0]:r.data;
        if(!r.error&&b){
          if(b.status==='trialing')subtitle=`Founding Beta · ${Number(b.days_remaining||0)} days left in trial`;
          if(b.status==='active')subtitle='Founding Beta · Active';
          if(b.status==='past_due')subtitle='Payment needs attention';
          if(b.status==='canceled')subtitle='Subscription canceled';
        }
      }catch(_){ }
      const btn=document.createElement('button');
      btn.type='button';btn.className='modern-more-item';btn.dataset.tradeosBilling='1';
      btn.innerHTML=`<span class="modern-more-icon">${icon}</span><span><strong>Plan & billing</strong><small>${esc(subtitle)}</small></span>`;
      btn.addEventListener('click',()=>{document.querySelector('.modern-more-sheet')?.remove();openBilling();});
      const signout=list.querySelector('[data-modern-signout]');list.insertBefore(btn,signout||null);
    }finally{delete list.dataset.billingMounting;}
  }

  function checkoutFor(base,companyId){
    const raw=String(base||'').trim();if(!raw)return'';
    try{const u=new URL(raw);u.searchParams.set('client_reference_id',companyId);return u.toString();}
    catch(_){return raw;}
  }

  async function openBilling(){
    document.querySelector('.tos-billing-sheet')?.remove();
    const ctx=await context();if(!ctx||!managerRoles.has(ctx.membership.role))return;
    const [billingRes,companyRes]=await Promise.all([
      client.rpc('get_company_billing',{target_company:ctx.companyId}),
      client.from('companies').select('name').eq('id',ctx.companyId).single()
    ]);
    if(billingRes.error){toast(billingRes.error.message);return;}
    const b=(Array.isArray(billingRes.data)?billingRes.data[0]:billingRes.data)||{};
    const companyName=companyRes.data?.name||'Your business';
    const status=String(b.status||'trialing');
    const days=Number(b.days_remaining||0);
    const active=status==='active';
    const trial=status==='trialing';
    const price=(Number(b.price_pence||2400)/100).toFixed(0);
    const trialCopy=trial?`${days} day${days===1?'':'s'} remaining`:(active?'Subscription active':pretty(status));
    const checkout=checkoutFor(b.checkout_url,ctx.companyId);

    const o=document.createElement('div');o.className='tos-billing-sheet';
    o.innerHTML=`<div class="tos-billing-panel" role="dialog" aria-modal="true" aria-label="Plan and billing">
      <div class="tos-billing-handle"></div>
      <div class="tos-billing-head"><div><span>TRADEOS PLAN</span><h3>Founding Beta</h3><p>${esc(companyName)}</p></div><button type="button" class="tos-billing-close" aria-label="Close">×</button></div>
      <div class="tos-billing-status ${esc(status)}"><span>${esc(trialCopy)}</span><strong>£${price}<small>/month per business</small></strong></div>
      <div class="tos-billing-card">
        <h4>Everything you need to run the job</h4>
        <div class="tos-billing-features">
          <span>✓ Jobs, team & scheduling</span><span>✓ Timesheets & job time</span><span>✓ Quotes & invoices</span><span>✓ Job profitability</span><span>✓ Customer quote/invoice links</span><span>✓ Job notes & photos</span>
        </div>
      </div>
      <div class="tos-billing-founder"><strong>Founding Beta price</strong><p>£${price}/month for the whole business while you are on the founding plan. We can change future public pricing without changing this founding offer.</p></div>
      ${active?'<button type="button" class="tos-billing-cta" disabled>Plan active</button>':checkout?'<button type="button" class="tos-billing-cta">Start Founding Beta — £'+price+'/month</button>':'<button type="button" class="tos-billing-cta" disabled>Payments connection being switched on</button>'}
      ${!active&&!checkout?'<p class="tos-billing-pending">Your trial stays active while Stripe is connected. No payment is taken from this screen yet.</p>':''}
    </div>`;
    document.body.appendChild(o);
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const close=()=>{o.remove();document.body.style.overflow=previousOverflow;};
    o.querySelector('.tos-billing-close')?.addEventListener('click',close);
    o.addEventListener('click',e=>{if(e.target===o)close();});
    if(checkout&&!active)o.querySelector('.tos-billing-cta')?.addEventListener('click',()=>{window.location.assign(checkout);});
  }

  function pretty(v){return String(v||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function toast(m){document.querySelector('.tos-billing-toast')?.remove();const t=document.createElement('div');t.className='tos-billing-toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();