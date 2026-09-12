(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false,busy=false,ctx=null;

  const privilegedRole=role=>['owner','admin','manager'].includes(String(role||'').toLowerCase());
  const canSeePricing=membership=>privilegedRole(membership?.role)||membership?.can_view_pricing===true;

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  async function getContext(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)return null;
    let companyId=document.querySelector('#company')?.value||null;
    let membership=null;
    if(companyId){
      const r=await client.from('company_members')
        .select('id,company_id,user_id,full_name,role,active,can_view_pricing')
        .eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      membership=r.data||null;
    }
    if(!membership){
      const r=await client.from('company_members')
        .select('id,company_id,user_id,full_name,role,active,can_view_pricing')
        .eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      membership=r.data||null;
      companyId=membership?.company_id||null;
    }
    return membership&&companyId?{user,companyId,membership}:null;
  }

  async function mount(){
    if(busy)return;
    busy=true;
    try{
      const next=await getContext();
      if(!next)return;
      ctx=next;
      applyPricingState();
      if(document.querySelector('[data-nav="team"].active'))await mountTeamControl();
    }catch(e){
      console.warn('TradeOS pricing access:',e);
    }finally{
      busy=false;
    }
  }

  function applyPricingState(){
    const allowed=canSeePricing(ctx?.membership);
    document.body.classList.toggle('tos-can-view-pricing',allowed);
    document.body.classList.toggle('tos-no-pricing',!allowed);
    if(allowed){
      document.querySelectorAll('[data-tos-price-hidden="1"]').forEach(el=>{
        el.hidden=false;
        delete el.dataset.tosPriceHidden;
      });
      return;
    }

    document.querySelectorAll('.jobs-list-clean .item-main small, .jobs-clean-page .item-main small').forEach(el=>{
      const text=(el.textContent||'').trim();
      if(/\bnet value\b|\bactual profit\b|\bgross profit\b|\bmargin\b/i.test(text))hide(el);
    });

    if(document.querySelector('[data-nav="jobs"].active')){
      document.querySelectorAll('main.wrap .item small').forEach(el=>{
        const text=(el.textContent||'').trim();
        if(/\bnet value\b|\bactual profit\b|\bgross profit\b|\bmargin\b/i.test(text))hide(el);
      });
    }
  }

  function hide(el){
    el.dataset.tosPriceHidden='1';
    el.hidden=true;
  }

  async function mountTeamControl(){
    if(!ctx||!['owner','admin'].includes(ctx.membership.role))return;
    const wrap=document.querySelector('main.wrap');
    if(!wrap||wrap.querySelector('.tos-pricing-access-card'))return;

    const r=await client.from('company_members')
      .select('id,user_id,full_name,role,active,can_view_pricing')
      .eq('company_id',ctx.companyId).eq('active',true).order('created_at',{ascending:true});
    if(r.error)throw r.error;
    const members=r.data||[];

    const card=document.createElement('section');
    card.className='card section tos-pricing-access-card';
    card.innerHTML=`
      <div class="tos-pricing-head">
        <div><span>PERMISSIONS</span><h3>Pricing access</h3><p>Choose which employees can see job values and profit figures.</p></div>
      </div>
      <div class="tos-pricing-list">${members.map(memberRow).join('')}</div>`;

    const teamGrid=wrap.querySelector('.team-grid');
    const rates=wrap.querySelector('.tos-rates-card');
    if(rates)rates.insertAdjacentElement('beforebegin',card);
    else if(teamGrid)wrap.insertBefore(card,teamGrid);
    else wrap.appendChild(card);

    card.querySelectorAll('[data-pricing-toggle]').forEach(input=>{
      input.addEventListener('change',()=>savePermission(input));
    });
  }

  function memberRow(m){
    const automatic=privilegedRole(m.role);
    const checked=automatic||m.can_view_pricing===true;
    const label=automatic?'Always allowed':checked?'Pricing visible':'Pricing hidden';
    return `<div class="tos-pricing-row">
      <div class="tos-pricing-person"><strong>${esc(m.full_name||pretty(m.role))}</strong><small>${esc(pretty(m.role))}</small></div>
      <label class="tos-pricing-switch ${automatic?'is-locked':''}">
        <span data-pricing-label="${esc(m.id)}">${esc(label)}</span>
        <input type="checkbox" data-pricing-toggle="${esc(m.id)}" ${checked?'checked':''} ${automatic?'disabled':''} aria-label="Pricing access for ${esc(m.full_name||'team member')}">
        <i aria-hidden="true"></i>
      </label>
    </div>`;
  }

  async function savePermission(input){
    if(!ctx)return;
    const memberId=input.dataset.pricingToggle;
    const label=document.querySelector(`[data-pricing-label="${css(memberId)}"]`);
    const checked=input.checked;
    input.disabled=true;
    if(label)label.textContent='Saving…';
    try{
      const r=await client.from('company_members')
        .update({can_view_pricing:checked})
        .eq('company_id',ctx.companyId).eq('id',memberId);
      if(r.error)throw r.error;
      if(label)label.textContent=checked?'Pricing visible':'Pricing hidden';
      toast(checked?'Pricing access enabled':'Pricing access removed');
    }catch(e){
      input.checked=!checked;
      if(label)label.textContent=input.checked?'Pricing visible':'Pricing hidden';
      toast(e?.message||'Could not update pricing access',true);
    }finally{
      input.disabled=false;
    }
  }

  function toast(message,error=false){
    document.querySelector('.tos-pricing-toast')?.remove();
    const t=document.createElement('div');t.className=`tos-pricing-toast${error?' error':''}`;t.textContent=message;
    document.body.appendChild(t);setTimeout(()=>t.remove(),2300);
  }
  function pretty(v){return String(v||'').replace(/(^|[_-])(\w)/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function css(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  new MutationObserver(()=>{
    if(ctx)applyPricingState();
    schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('change',e=>{if(e.target?.id==='company'){ctx=null;schedule();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
