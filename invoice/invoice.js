(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co',KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),root=document.querySelector('#doc'),money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  const token=new URLSearchParams(location.search).get('t');if(!token){fail('This invoice link is missing.');return}load();

  async function load(){
    try{
      const r=await sb.rpc('get_public_invoice',{share_token:token});
      if(r.error)throw r.error;
      render(r.data||{});
    }catch(e){fail(e?.message||'Could not load this invoice.')}
  }

  function render(i){
    const status=displayStatus(i),items=Array.isArray(i.items)?i.items:[],brand=document.querySelector('.doc-brand strong'),sub=document.querySelector('.doc-brand small');
    if(brand)brand.textContent=i.company_name||'Trade business';
    if(sub)sub.textContent='Customer invoice';
    document.title=`${i.invoice_number||'Invoice'} · ${i.company_name||'Trade business'}`;

    const business=[i.company_address,i.company_phone,i.company_email,i.company_website].filter(Boolean).map(esc).join('\n');
    const customer=[i.customer_name||'Customer',i.customer_address,i.customer_email,i.customer_phone].filter(Boolean).map(esc).join('\n');
    const registrations=[i.company_number?`Company no. ${esc(i.company_number)}`:'',i.vat_number?`VAT no. ${esc(i.vat_number)}`:''].filter(Boolean).join(' · ');
    const hasBank=i.bank_account_name||i.bank_sort_code||i.bank_account_number;
    const outstanding=Math.max(0,Number(i.outstanding||0));
    const paid=Math.max(0,Number(i.paid||0));
    const rows=items.length?items.map(itemRow).join(''):fallbackRow(i);

    root.innerHTML=`<article class="doc-paper invoice-paper">
      <header class="doc-head invoice-head">
        <div class="invoice-title-block"><p class="doc-kicker">INVOICE</p><h1>${esc(i.invoice_number||'Invoice')}</h1><p class="invoice-job-ref">${esc(i.job_title||'Work completed')}</p></div>
        <div class="invoice-head-side"><span class="doc-status ${esc(status)}">${esc(status.replaceAll('_',' '))}</span><strong>${money.format(Number(i.total||0))}</strong><small>Total invoice</small></div>
      </header>
      <div class="doc-body invoice-body">
        <section class="invoice-meta-grid">
          <div class="invoice-party"><span>From</span><strong>${esc(i.company_name||'Trade business')}</strong>${i.trade_type?`<p>${esc(i.trade_type)}</p>`:''}${business?`<p>${business}</p>`:''}${registrations?`<small>${registrations}</small>`:''}</div>
          <div class="invoice-party"><span>Bill to</span><strong>${customer}</strong></div>
          <div class="invoice-meta-card"><span>Invoice date</span><strong>${date(i.created_at)}</strong></div>
          <div class="invoice-meta-card"><span>Due date</span><strong>${i.due_date?dateOnly(i.due_date):'Not set'}</strong></div>
        </section>

        <section class="doc-section invoice-items-section">
          <div class="invoice-section-head"><h2>Invoice breakdown</h2>${i.job_address?`<small>Job: ${esc(i.job_address)}</small>`:''}</div>
          <div class="invoice-table" role="table" aria-label="Invoice items">
            <div class="invoice-table-row invoice-table-head" role="row"><span>Description</span><span>Qty</span><span>Rate</span><span>VAT</span><span>Amount</span></div>
            ${rows}
          </div>
        </section>

        <section class="invoice-totals-wrap">
          <div class="invoice-payment-summary">
            ${outstanding>0?`<span>Amount due${i.due_date?` by ${dateOnly(i.due_date)}`:''}</span><strong>${money.format(outstanding)}</strong>`:`<span>Balance</span><strong>${money.format(0)}</strong>`}
            ${paid>0?`<small>${money.format(paid)} already paid</small>`:''}
          </div>
          <div class="invoice-totals">
            <div><span>Net</span><strong>${money.format(Number(i.subtotal||0))}</strong></div>
            <div><span>VAT</span><strong>${money.format(Number(i.vat||0))}</strong></div>
            <div class="grand"><span>Total</span><strong>${money.format(Number(i.total||0))}</strong></div>
            ${paid>0?`<div><span>Paid</span><strong>− ${money.format(paid)}</strong></div>`:''}
            <div class="balance"><span>Balance due</span><strong>${money.format(outstanding)}</strong></div>
          </div>
        </section>

        ${outstanding>0&&hasBank?`<section class="doc-section doc-bank invoice-bank"><div class="invoice-section-head"><h2>Payment details</h2><small>Please use the invoice number as your payment reference.</small></div><div class="doc-bank-grid">${i.bank_account_name?`<div><span>Account name</span><strong>${esc(i.bank_account_name)}</strong></div>`:''}${i.bank_sort_code?`<div><span>Sort code</span><strong>${esc(i.bank_sort_code)}</strong></div>`:''}${i.bank_account_number?`<div><span>Account number</span><strong>${esc(i.bank_account_number)}</strong></div>`:''}<div><span>Reference</span><strong>${esc(i.invoice_number||'Invoice')}</strong></div></div></section>`:''}

        ${i.notes?`<section class="doc-section invoice-note-block"><h2>Notes</h2><p class="doc-copy">${esc(i.notes)}</p></section>`:''}
        ${i.invoice_terms?`<section class="doc-section doc-terms"><h2>Payment terms</h2><p class="doc-copy">${esc(i.invoice_terms)}</p></section>`:''}
        ${outstanding<=.005?`<div class="doc-result"><strong>Paid in full</strong><p>Thank you — there is nothing further to pay on this invoice.</p></div>`:status==='overdue'?`<div class="doc-result expired"><strong>Payment overdue</strong><p>Please arrange payment of ${money.format(outstanding)} or contact ${esc(i.company_name||'the trade business')} if you need to discuss this invoice.</p></div>`:''}

        <div class="doc-actions single"><button class="doc-btn primary" data-print>Save / print invoice PDF</button></div>
        <p class="doc-note">This secure invoice link shows the latest payment status. Save the PDF if you need a copy for your records.</p>
      </div>
    </article>`;
    root.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
  }

  function itemRow(x){
    const qty=Number(x.quantity||1),unit=Number(x.unit_price||0),vatRate=Number(x.vat_rate||0),amount=Number(x.line_total ?? x.line_subtotal ?? (qty*unit));
    return `<div class="invoice-table-row" role="row"><span class="invoice-desc">${esc(x.description||'Work')}</span><span data-label="Qty">${formatQty(qty)}</span><span data-label="Rate">${money.format(unit)}</span><span data-label="VAT">${vatRate?`${trim(vatRate)}%`:'—'}</span><strong data-label="Amount">${money.format(amount)}</strong></div>`;
  }

  function fallbackRow(i){
    const net=Number(i.subtotal||0),vat=Number(i.vat||0),vatRate=net>0?vat/net*100:0;
    return `<div class="invoice-table-row" role="row"><span class="invoice-desc">${esc(i.job_title||'Work completed')}</span><span data-label="Qty">1</span><span data-label="Rate">${money.format(net)}</span><span data-label="VAT">${vatRate?`${trim(vatRate)}%`:'—'}</span><strong data-label="Amount">${money.format(net+vat)}</strong></div>`;
  }

  function displayStatus(i){if(Number(i.outstanding||0)<=.005)return'paid';if(i.status==='void')return'void';if(i.due_date&&new Date(`${i.due_date}T23:59:59`).getTime()<Date.now())return'overdue';return String(i.status||'sent').toLowerCase()}
  function fail(m){root.innerHTML=`<div class="doc-error"><strong>Invoice unavailable</strong><div>${esc(m)}</div></div>`}
  function date(v){const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(d)}
  function dateOnly(v){const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(d)}
  function formatQty(v){return Number.isInteger(v)?String(v):String(Number(v.toFixed(2)))}
  function trim(v){return String(Number(Number(v).toFixed(2)))}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
})();