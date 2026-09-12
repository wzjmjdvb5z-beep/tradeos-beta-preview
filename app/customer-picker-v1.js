(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;
  let queued=false;

  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}

  async function mount(){
    const form=document.querySelector('#tos-com-quote-form');
    if(!form||form.dataset.customerPickerMounted==='1')return;
    form.dataset.customerPickerMounted='1';
    const section=form.querySelector('.tos-com-form-section');
    const fields=section?.querySelector('.tos-com-grid');
    if(!section||!fields)return;

    const companyId=await getCompanyId();
    if(!companyId||!form.isConnected)return;
    const r=await client.from('customers').select('id,name,email,phone,address,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(1000);
    if(r.error||!form.isConnected)return;
    const customers=r.data||[];

    fields.classList.add('tos-customer-fields');
    const selected=document.createElement('input');selected.type='hidden';selected.name='selectedCustomer';form.appendChild(selected);
    const chooser=document.createElement('div');chooser.className='tos-customer-chooser';
    section.insertBefore(chooser,fields);

    let current=null,mode=customers.length?'choose':'new';
    const inputs={
      name:form.elements.customerName,
      email:form.elements.customerEmail,
      phone:form.elements.customerPhone,
      address:form.elements.customerAddress
    };

    function render(){
      if(mode==='new'){
        fields.hidden=false;
        chooser.innerHTML=`<div class="tos-customer-state"><div><span class="tos-customer-kicker">CUSTOMER</span><strong>New customer</strong><small>They’ll be saved automatically for next time.</small></div>${customers.length?'<button type="button" data-customer-choose>Choose saved</button>':''}</div>`;
      }else if(current){
        fields.hidden=true;
        chooser.innerHTML=`<div class="tos-customer-selected"><div class="tos-customer-avatar">${initials(current.name)}</div><div class="tos-customer-selected-copy"><span>Customer</span><strong>${esc(current.name||'Customer')}</strong><small>${esc(summary(current))}</small></div><button type="button" data-customer-change>Change</button></div><button type="button" class="tos-customer-edit" data-customer-edit>Edit customer details for this quote</button>`;
      }else{
        fields.hidden=true;
        chooser.innerHTML=`<button type="button" class="tos-customer-pick-card" data-customer-choose><span class="tos-customer-pick-icon">⌕</span><span><strong>Choose customer</strong><small>${customers.length} saved customer${customers.length===1?'':'s'} · Search by name, email, phone or address</small></span><span>›</span></button><button type="button" class="tos-customer-new-btn" data-customer-new>+ New customer</button>`;
      }
      chooser.querySelector('[data-customer-choose]')?.addEventListener('click',openPicker);
      chooser.querySelector('[data-customer-change]')?.addEventListener('click',openPicker);
      chooser.querySelector('[data-customer-new]')?.addEventListener('click',startNew);
      chooser.querySelector('[data-customer-edit]')?.addEventListener('click',()=>{fields.hidden=false;chooser.querySelector('[data-customer-edit]')?.remove();inputs.name?.focus();});
    }

    function useCustomer(c){
      current=c;mode='saved';selected.value=c.id;
      if(inputs.name)inputs.name.value=c.name||'';
      if(inputs.email)inputs.email.value=c.email||'';
      if(inputs.phone)inputs.phone.value=c.phone||'';
      if(inputs.address)inputs.address.value=c.address||'';
      document.querySelector('.tos-customer-overlay')?.remove();render();
    }

    function startNew(){
      current=null;mode='new';selected.value='';
      Object.values(inputs).forEach(i=>{if(i)i.value='';});
      document.querySelector('.tos-customer-overlay')?.remove();render();
      setTimeout(()=>inputs.name?.focus(),60);
    }

    function openPicker(){
      document.querySelector('.tos-customer-overlay')?.remove();
      const overlay=document.createElement('div');overlay.className='tos-customer-overlay';
      overlay.innerHTML=`<div class="tos-customer-panel"><div class="tos-customer-handle"></div><div class="tos-customer-head"><div><h3>Choose customer</h3><p>Select a saved customer or add somebody new.</p></div><button type="button" data-customer-close>×</button></div><div class="tos-customer-search"><span>⌕</span><input type="search" inputmode="search" placeholder="Search customers" autocomplete="off"></div><div class="tos-customer-results"></div><button type="button" class="tos-customer-add-new" data-customer-new-sheet>+ Add new customer</button></div>`;
      document.body.appendChild(overlay);
      const search=overlay.querySelector('input'),results=overlay.querySelector('.tos-customer-results');
      const draw=()=>{
        const q=String(search.value||'').trim().toLowerCase();
        const list=customers.filter(c=>!q||[c.name,c.email,c.phone,c.address].some(v=>String(v||'').toLowerCase().includes(q)));
        results.innerHTML=list.length?list.map(c=>`<button type="button" class="tos-customer-result" data-customer-id="${esc(c.id)}"><span class="tos-customer-avatar">${initials(c.name)}</span><span><strong>${esc(c.name||'Customer')}</strong><small>${esc(summary(c))}</small></span><b>›</b></button>`).join(''):`<div class="tos-customer-empty">No matching customers</div>`;
        results.querySelectorAll('[data-customer-id]').forEach(b=>b.addEventListener('click',()=>useCustomer(customers.find(c=>c.id===b.dataset.customerId))));
      };
      draw();search.addEventListener('input',draw);overlay.querySelector('[data-customer-close]').addEventListener('click',()=>overlay.remove());overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});overlay.querySelector('[data-customer-new-sheet]').addEventListener('click',startNew);setTimeout(()=>search.focus(),80);
    }

    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const fd=new FormData(form),submit=form.querySelector('.tos-com-save'),err=form.querySelector('[data-form-error]');
      const customer=String(fd.get('customerName')||'').trim(),title=String(fd.get('quoteTitle')||'').trim();
      if(!customer||!title){showError(err,'Choose a customer and enter a job title.');return;}
      if(submit?.disabled)return;
      if(err)err.hidden=true;if(submit){submit.disabled=true;submit.textContent='Saving…';}
      try{
        const rpc=await client.rpc('create_trade_quote_v2',{
          target_company:companyId,
          selected_customer:selected.value||null,
          customer_name:customer,
          customer_email:nullable(fd.get('customerEmail')),
          customer_phone:nullable(fd.get('customerPhone')),
          customer_address:nullable(fd.get('customerAddress')),
          quote_title:title,
          quote_description:nullable(fd.get('quoteDescription')),
          labour_hours:num(fd.get('labourHours')),
          hourly_rate:num(fd.get('hourlyRate')),
          materials_cost:num(fd.get('materialsCost')),
          callout_fee:num(fd.get('calloutFee')),
          vat_rate:num(fd.get('vatRate'))
        });
        if(rpc.error)throw rpc.error;
        document.querySelector('.tos-customer-overlay')?.remove();
        document.querySelector('.tos-com-sheet')?.remove();document.body.classList.remove('tos-com-sheet-open');
        toast('Quote saved');
        const wrap=document.querySelector('main.wrap');if(wrap){delete wrap.dataset.commercialView;wrap.classList.toggle('tos-customer-refresh');}
      }catch(x){if(submit){submit.disabled=false;submit.textContent='Save quote';}showError(err,x?.message||'Could not save quote.');}
    },true);

    render();
  }

  async function getCompanyId(){
    const direct=document.querySelector('#company')?.value;if(direct)return direct;
    const {data:{user}}=await client.auth.getUser();if(!user)return null;
    const r=await client.from('company_members').select('company_id').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();return r.data?.company_id||null;
  }
  function summary(c){return [c.email,c.phone,c.address].filter(Boolean).join(' · ')||'Saved customer';}
  function initials(v){const p=String(v||'?').trim().split(/\s+/).filter(Boolean);return esc((p[0]?.[0]||'?')+(p.length>1?(p[p.length-1]?.[0]||''):''));}
  function nullable(v){const s=String(v??'').trim();return s||null;}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function showError(el,msg){if(!el)return;el.textContent=msg;el.hidden=false;el.scrollIntoView({block:'nearest',behavior:'smooth'});}
  function toast(msg){document.querySelector('.tos-customer-toast')?.remove();const t=document.createElement('div');t.className='tos-customer-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2500);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();