(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;
  const managerRoles=new Set(['owner','admin','manager']);
  let queued=false;
  const icon='<svg viewBox="0 0 24 24"><path d="M4 20V7l8-4 8 4v13z"/><path d="M8 20v-5h8v5M8 9h2M14 9h2M8 12h2M14 12h2"/></svg>';
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

    // Clean up any duplicates left behind by an older cached build.
    const existing=[...list.querySelectorAll('[data-business-profile]')];
    if(existing.length>1)existing.slice(1).forEach(x=>x.remove());
    if(existing.length)return;

    // Lock this specific More sheet before the async account lookup. Without this,
    // multiple MutationObserver passes can all get through and insert duplicates.
    if(list.dataset.businessProfileMounting==='1')return;
    list.dataset.businessProfileMounting='1';
    try{
      const ctx=await context();
      if(!ctx||!managerRoles.has(ctx.membership.role)||!list.isConnected)return;
      if(list.querySelector('[data-business-profile]'))return;
      const b=document.createElement('button');b.type='button';b.className='modern-more-item';b.dataset.businessProfile='1';
      b.innerHTML=`<span class="modern-more-icon">${icon}</span><span><strong>Business profile</strong><small>Branding, contact details, terms & payment details</small></span>`;
      b.addEventListener('click',()=>{document.querySelector('.modern-more-sheet')?.remove();openProfile();});
      const signout=list.querySelector('[data-modern-signout]');list.insertBefore(b,signout||null);
    }finally{
      delete list.dataset.businessProfileMounting;
    }
  }
  async function openProfile(){
    document.querySelector('.tos-profile-sheet')?.remove();
    const ctx=await context();if(!ctx||!managerRoles.has(ctx.membership.role))return;
    const r=await client.from('companies').select('id,name,trade_type,contact_email,contact_phone,address,website,vat_number,company_number,bank_account_name,bank_sort_code,bank_account_number,quote_terms,invoice_terms,quote_valid_days').eq('id',ctx.companyId).single();
    if(r.error){toast(r.error.message);return;} const c=r.data||{};
    const o=document.createElement('div');o.className='tos-profile-sheet';
    o.innerHTML=`<div class="tos-profile-panel" role="dialog" aria-modal="true" aria-label="Business profile"><div class="tos-profile-handle"></div><div class="tos-profile-head"><div><h3>Business profile</h3><p>These details appear on customer quotes and invoices.</p></div><button type="button" class="tos-profile-close" aria-label="Close">×</button></div><form class="tos-profile-form">
      <section class="tos-profile-section"><h4>Business details</h4><div class="tos-profile-grid"><label class="full">Business name<input name="name" required value="${escAttr(c.name||'')}"></label><label>Trade / business type<input name="tradeType" value="${escAttr(c.trade_type||'')}"></label><label>Company number<input name="companyNumber" value="${escAttr(c.company_number||'')}"></label><label>VAT number<input name="vatNumber" value="${escAttr(c.vat_number||'')}"></label><label>Website<input name="website" inputmode="url" value="${escAttr(c.website||'')}"></label><label>Email<input name="email" type="email" inputmode="email" value="${escAttr(c.contact_email||'')}"></label><label>Phone<input name="phone" type="tel" inputmode="tel" value="${escAttr(c.contact_phone||'')}"></label><label class="full">Business address<textarea name="address" rows="2">${esc(c.address||'')}</textarea></label></div></section>
      <section class="tos-profile-section"><h4>Quotes</h4><div class="tos-profile-grid"><label>Quote valid for (days)<input name="validDays" type="number" inputmode="numeric" min="1" max="180" value="${Number(c.quote_valid_days||30)}"></label><label class="full">Default quote terms<textarea name="quoteTerms" rows="4" placeholder="e.g. Price valid for 30 days. Variations will be agreed before work proceeds.">${esc(c.quote_terms||'')}</textarea></label></div><p class="tos-profile-help">New quotes automatically use your validity period. Terms appear on the customer document.</p></section>
      <section class="tos-profile-section"><h4>Invoices & payment</h4><div class="tos-profile-grid"><label>Account name<input name="accountName" value="${escAttr(c.bank_account_name||'')}"></label><label>Sort code<input name="sortCode" inputmode="numeric" value="${escAttr(c.bank_sort_code||'')}"></label><label>Account number<input name="accountNumber" inputmode="numeric" value="${escAttr(c.bank_account_number||'')}"></label><label class="full">Invoice terms<textarea name="invoiceTerms" rows="4" placeholder="e.g. Payment due within 14 days. Please use the invoice number as payment reference.">${esc(c.invoice_terms||'')}</textarea></label></div><p class="tos-profile-help">Bank details only appear on secure customer invoice links.</p></section>
      <div class="tos-profile-error" hidden></div><div class="tos-profile-actions"><button type="submit" class="tos-profile-save">Save business profile</button></div>
    </form></div>`;
    document.body.appendChild(o);document.body.style.overflow='hidden';
    const close=()=>{o.remove();document.body.style.overflow='';};o.querySelector('.tos-profile-close').addEventListener('click',close);o.addEventListener('click',e=>{if(e.target===o)close();});
    o.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f),btn=f.querySelector('.tos-profile-save'),err=f.querySelector('.tos-profile-error');err.hidden=true;const days=Number(fd.get('validDays')||30);if(!String(fd.get('name')||'').trim()){err.textContent='Business name is required.';err.hidden=false;return;}if(days<1||days>180){err.textContent='Quote validity must be between 1 and 180 days.';err.hidden=false;return;}btn.disabled=true;btn.textContent='Saving…';try{const s=await client.rpc('update_company_document_profile',{target_company:ctx.companyId,business_name:String(fd.get('name')||''),business_trade_type:n(fd.get('tradeType')),business_email:n(fd.get('email')),business_phone:n(fd.get('phone')),business_address:n(fd.get('address')),business_website:n(fd.get('website')),business_vat_number:n(fd.get('vatNumber')),business_company_number:n(fd.get('companyNumber')),payment_account_name:n(fd.get('accountName')),payment_sort_code:n(fd.get('sortCode')),payment_account_number:n(fd.get('accountNumber')),default_quote_terms:n(fd.get('quoteTerms')),default_invoice_terms:n(fd.get('invoiceTerms')),default_quote_valid_days:days});if(s.error)throw s.error;close();toast('Business profile saved');}catch(x){btn.disabled=false;btn.textContent='Save business profile';err.textContent=x?.message||'Could not save business profile.';err.hidden=false;}});
  }
  function toast(m){document.querySelector('.tos-profile-toast')?.remove();const t=document.createElement('div');t.className='tos-profile-toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}
  function n(v){const s=String(v??'').trim();return s||null;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function escAttr(v){return esc(v).replace(/`/g,'&#96;');}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();