(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  const managerRoles=new Set(['owner','admin','manager']);
  const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  const dateFmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'});
  let queued=false, renderId=0, financeTab='invoices', currentCtx=null;

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  async function mount(){
    const view=currentView();
    if(view!=='quotes'&&view!=='finance')return;
    const wrap=document.querySelector('main.wrap');
    if(!wrap||wrap.dataset.commercialView===view)return;
    const id=++renderId;
    wrap.dataset.commercialView=view;
    wrap.classList.add('tos-commercial-wrap');
    wrap.innerHTML=loadingMarkup(view);
    try{
      const ctx=await loadContext();
      if(id!==renderId||currentView()!==view)return;
      currentCtx=ctx;
      if(view==='quotes')drawQuotes(wrap,ctx);else drawFinance(wrap,ctx);
    }catch(err){
      if(id!==renderId)return;
      drawError(wrap,view,err);
    }
  }

  function currentView(){
    const active=[...document.querySelectorAll('.bottom-nav [data-nav].active')].find(x=>!x.classList.contains('modern-more'));
    return active?.dataset?.nav||'';
  }

  async function loadContext(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)throw userError||new Error('Please sign in again.');
    let companyId=document.querySelector('#company')?.value||null;
    let membership=null;
    if(companyId){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      if(r.error)throw r.error;
      membership=r.data;
    }
    if(!membership){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(r.error)throw r.error;
      membership=r.data;
      companyId=membership?.company_id||null;
    }
    if(!membership||!companyId)throw new Error('No active TradeOS workspace found.');

    const [quotesR,customersR,jobsR,invoicesR,itemsR,paymentsR]=await Promise.all([
      client.from('quotes').select('id,company_id,customer_id,quote_number,status,title,description,labour_hours,hourly_rate,materials_cost,callout_fee,vat_rate,subtotal,vat,total,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(300),
      client.from('customers').select('id,company_id,name,email,phone,address').eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
      client.from('jobs').select('id,company_id,customer_id,quote_id,title,status,address,notes,agreed_value,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
      client.from('invoices').select('id,company_id,customer_id,job_id,invoice_number,status,subtotal,vat,total,due_date,notes,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(300),
      client.from('invoice_items').select('id,company_id,invoice_id,description,quantity,unit_price,vat_rate,line_subtotal,line_vat,line_total,created_at').eq('company_id',companyId).order('created_at',{ascending:true}).limit(1000),
      client.from('payments').select('id,company_id,invoice_id,amount,paid_at,method,reference,created_at').eq('company_id',companyId).order('paid_at',{ascending:false}).limit(1000)
    ]);
    for(const r of [quotesR,customersR,jobsR,invoicesR,itemsR,paymentsR])if(r.error)throw r.error;

    let profitability=[];
    const isManager=managerRoles.has(membership.role);
    if(isManager){
      const p=await client.rpc('get_job_profitability',{target_company:companyId});
      if(!p.error)profitability=p.data||[];
    }
    return {user,companyId,membership,isManager,quotes:quotesR.data||[],customers:customersR.data||[],jobs:jobsR.data||[],invoices:invoicesR.data||[],items:itemsR.data||[],payments:paymentsR.data||[],profitability};
  }

  function loadingMarkup(view){return `<section class="tos-com-hero"><p class="eyebrow">${view==='quotes'?'QUOTES':'FINANCE'}</p><h2>${view==='quotes'?'Quotes':'Finance'}</h2><p>Loading…</p></section>`;}
  function drawError(wrap,view,err){wrap.innerHTML=`<section class="tos-com-hero"><p class="eyebrow">${view==='quotes'?'QUOTES':'FINANCE'}</p><h2>${view==='quotes'?'Quotes':'Finance'}</h2><p>Something went wrong loading this section.</p></section><div class="tos-com-error">${esc(err?.message||'Could not load this section.')}</div>`;}

  function drawQuotes(wrap,ctx){
    wrap.dataset.commercialView='quotes';
    const draft=ctx.quotes.filter(q=>q.status==='draft').length;
    const accepted=ctx.quotes.filter(q=>q.status==='accepted').length;
    wrap.innerHTML=`
      <section class="tos-com-hero"><div><p class="eyebrow">QUOTES</p><h2>Quotes</h2><p>Create the price, keep it clear, then turn approved work into a job.</p></div>${ctx.isManager?'<button class="tos-com-primary" type="button" data-com-new-quote>New quote</button>':''}</section>
      <section class="tos-com-mini-summary"><div><span>Draft</span><strong>${draft}</strong></div><div><span>Converted</span><strong>${accepted}</strong></div><div><span>Total</span><strong>${ctx.quotes.length}</strong></div></section>
      ${ctx.isManager?`<button class="tos-com-action-card" type="button" data-com-new-quote><span class="tos-com-action-plus">+</span><span><strong>Create a quote</strong><small>Customer, job details and price</small></span><span class="tos-com-chevron">›</span></button>`:''}
      <section class="tos-com-section"><div class="tos-com-section-head"><div><h3>Your quotes</h3><p>${ctx.quotes.length?'Tap a quote to see the full breakdown.':'No quotes yet.'}</p></div></div>${ctx.quotes.length?`<div class="tos-com-list">${ctx.quotes.map(q=>quoteCard(q,ctx)).join('')}</div>`:emptyState('No quotes yet','Create your first quote to start the job flow.')}</section>`;
    wrap.querySelectorAll('[data-com-new-quote]').forEach(b=>b.addEventListener('click',()=>openQuoteForm(ctx)));
    wrap.querySelectorAll('[data-com-quote]').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('[data-com-convert]'))return;openQuoteDetail(b.dataset.comQuote,ctx);}));
    wrap.querySelectorAll('[data-com-convert]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();convertQuote(b.dataset.comConvert,b);}));
  }

  function quoteCard(q,ctx){
    const customer=ctx.customers.find(c=>c.id===q.customer_id);
    const job=ctx.jobs.find(j=>j.quote_id===q.id);
    return `<article class="tos-com-card tos-com-clickable" data-com-quote="${esc(q.id)}"><div class="tos-com-card-main"><div class="tos-com-card-top"><div><strong>${esc(q.title||'Untitled quote')}</strong><small>${esc(q.quote_number||'Quote')} · ${esc(customer?.name||'Customer')}</small></div>${statusChip(q.status)}</div><div class="tos-com-card-money">${money.format(num(q.total))}</div><div class="tos-com-card-meta"><span>Net ${money.format(num(q.subtotal))}</span><span>VAT ${money.format(num(q.vat))}</span><span>${formatDate(q.created_at)}</span></div></div><div class="tos-com-card-actions">${ctx.isManager&&q.status!=='accepted'?`<button type="button" class="tos-com-secondary" data-com-convert="${esc(q.id)}">Turn into job</button>`:job?'<span class="tos-com-success-text">Job created</span>':''}<button type="button" class="tos-com-link">View</button></div></article>`;
  }

  function openQuoteForm(ctx){
    closeSheet();
    const overlay=sheet('NEW QUOTE','Create a quote','Keep it simple: customer, work and price.');
    const body=overlay.querySelector('.tos-com-sheet-body');
    body.innerHTML=`<form id="tos-com-quote-form" class="tos-com-form">
      <div class="tos-com-form-section"><h4>Customer</h4><div class="tos-com-grid"><label class="full">Customer name<input name="customerName" autocomplete="name" required></label><label>Email<input name="customerEmail" type="email" inputmode="email" autocomplete="email"></label><label>Phone<input name="customerPhone" type="tel" inputmode="tel" autocomplete="tel"></label><label class="full">Address<input name="customerAddress" autocomplete="street-address"></label></div></div>
      <div class="tos-com-form-section"><h4>Work</h4><div class="tos-com-grid"><label class="full">Job title<input name="quoteTitle" required placeholder="e.g. Consumer unit replacement"></label><label class="full">Description<textarea name="quoteDescription" rows="3" placeholder="What is included?"></textarea></label></div></div>
      <div class="tos-com-form-section"><h4>Price</h4><div class="tos-com-grid price"><label>Labour hours<input name="labourHours" type="number" inputmode="decimal" min="0" step="0.25" value="1"></label><label>Hourly rate (£)<input name="hourlyRate" type="number" inputmode="decimal" min="0" step="0.01" value="45"></label><label>Materials (£)<input name="materialsCost" type="number" inputmode="decimal" min="0" step="0.01" value="0"></label><label>Call-out (£)<input name="calloutFee" type="number" inputmode="decimal" min="0" step="0.01" value="0"></label><label>VAT (%)<input name="vatRate" type="number" inputmode="decimal" min="0" step="0.01" value="20"></label></div></div>
      <div class="tos-com-total-box"><div><span>Net</span><strong data-q-net>£0.00</strong></div><div><span>VAT</span><strong data-q-vat>£0.00</strong></div><div class="total"><span>Total</span><strong data-q-total>£0.00</strong></div></div>
      <div class="tos-com-form-error" data-form-error hidden></div><button class="tos-com-save" type="submit">Save quote</button>
    </form>`;
    document.body.appendChild(overlay);
    const form=body.querySelector('#tos-com-quote-form');
    const calc=()=>{
      const fd=new FormData(form), labour=num(fd.get('labourHours'))*num(fd.get('hourlyRate')), net=labour+num(fd.get('materialsCost'))+num(fd.get('calloutFee')), vat=net*num(fd.get('vatRate'))/100;
      setText(form,'[data-q-net]',money.format(net));setText(form,'[data-q-vat]',money.format(vat));setText(form,'[data-q-total]',money.format(net+vat));
    };
    form.querySelectorAll('input').forEach(i=>i.addEventListener('input',calc));calc();
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const submit=form.querySelector('.tos-com-save'),err=form.querySelector('[data-form-error]'),fd=new FormData(form);
      const customer=String(fd.get('customerName')||'').trim(), title=String(fd.get('quoteTitle')||'').trim();
      if(!customer||!title){showFormError(err,'Customer name and job title are required.');return;}
      await busyButton(submit,'Saving…',async()=>{
        const r=await client.rpc('create_trade_quote',{target_company:ctx.companyId,customer_name:customer,customer_email:nullable(fd.get('customerEmail')),customer_phone:nullable(fd.get('customerPhone')),customer_address:nullable(fd.get('customerAddress')),quote_title:title,quote_description:nullable(fd.get('quoteDescription')),labour_hours:num(fd.get('labourHours')),hourly_rate:num(fd.get('hourlyRate')),materials_cost:num(fd.get('materialsCost')),callout_fee:num(fd.get('calloutFee')),vat_rate:num(fd.get('vatRate'))});
        if(r.error)throw r.error;
        closeSheet();toast('Quote saved');await reload('quotes');
      },err);
    });
  }

  function openQuoteDetail(id,ctx){
    const q=ctx.quotes.find(x=>x.id===id);if(!q)return;
    const customer=ctx.customers.find(c=>c.id===q.customer_id);
    const job=ctx.jobs.find(j=>j.quote_id===q.id);
    const overlay=sheet('QUOTE',q.title||'Quote',q.quote_number||'');
    overlay.querySelector('.tos-com-sheet-body').innerHTML=`<div class="tos-com-detail-block"><div class="tos-com-detail-row"><span>Status</span>${statusChip(q.status)}</div><div class="tos-com-detail-row"><span>Customer</span><strong>${esc(customer?.name||'Customer')}</strong></div>${customer?.email?`<div class="tos-com-detail-row"><span>Email</span><strong>${esc(customer.email)}</strong></div>`:''}${customer?.phone?`<div class="tos-com-detail-row"><span>Phone</span><strong>${esc(customer.phone)}</strong></div>`:''}${customer?.address?`<div class="tos-com-detail-row"><span>Address</span><strong>${esc(customer.address)}</strong></div>`:''}</div>${q.description?`<div class="tos-com-detail-copy"><h4>Work</h4><p>${esc(q.description)}</p></div>`:''}<div class="tos-com-breakdown"><div><span>Labour</span><strong>${money.format(num(q.labour_hours)*num(q.hourly_rate))}</strong></div><div><span>Materials</span><strong>${money.format(num(q.materials_cost))}</strong></div><div><span>Call-out</span><strong>${money.format(num(q.callout_fee))}</strong></div><div><span>Net</span><strong>${money.format(num(q.subtotal))}</strong></div><div><span>VAT</span><strong>${money.format(num(q.vat))}</strong></div><div class="total"><span>Total</span><strong>${money.format(num(q.total))}</strong></div></div>${ctx.isManager&&q.status!=='accepted'?`<button class="tos-com-save" type="button" data-sheet-convert>Turn into job</button>`:job?'<div class="tos-com-success-box">This quote has been converted into a job.</div>':''}`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-sheet-convert]')?.addEventListener('click',()=>convertQuote(q.id,overlay.querySelector('[data-sheet-convert]')));
  }

  async function convertQuote(id,button){
    await busyButton(button,'Creating job…',async()=>{
      const r=await client.rpc('convert_trade_quote_to_job',{target_quote:id});if(r.error)throw r.error;
      closeSheet();toast('Job created from quote');await reload('quotes');
    });
  }

  function drawFinance(wrap,ctx){
    wrap.dataset.commercialView='finance';
    if(!ctx.isManager){
      wrap.innerHTML='<section class="tos-com-hero"><div><p class="eyebrow">FINANCE</p><h2>Finance</h2><p>Job profit and invoices are available to managers.</p></div></section>';
      return;
    }
    const paidTotal=sum(ctx.payments.map(p=>num(p.amount)));
    const outstanding=sum(ctx.invoices.filter(i=>i.status!=='void').map(i=>Math.max(0,num(i.total)-paidFor(i.id,ctx))));
    const gross=sum(ctx.profitability.map(p=>num(p.gross_profit)));
    wrap.innerHTML=`<section class="tos-com-hero"><div><p class="eyebrow">FINANCE</p><h2>Finance</h2><p>Invoices first. Profit detail when you need it.</p></div>${financeTab==='invoices'?'<button class="tos-com-primary" type="button" data-com-new-invoice>New invoice</button>':''}</section>
      <section class="tos-com-money-summary"><div><span>Outstanding</span><strong>${money.format(outstanding)}</strong></div><div><span>Paid</span><strong>${money.format(paidTotal)}</strong></div><div><span>Gross profit</span><strong>${money.format(gross)}</strong></div></section>
      <div class="tos-com-tabs"><button class="${financeTab==='invoices'?'active':''}" data-com-fin-tab="invoices">Invoices</button><button class="${financeTab==='profit'?'active':''}" data-com-fin-tab="profit">Job profit</button></div>
      <div data-com-fin-body>${financeTab==='invoices'?invoicePanel(ctx):profitPanel(ctx)}</div>`;
    wrap.querySelectorAll('[data-com-fin-tab]').forEach(b=>b.addEventListener('click',()=>{financeTab=b.dataset.comFinTab;drawFinance(wrap,ctx);}));
    wrap.querySelector('[data-com-new-invoice]')?.addEventListener('click',()=>openInvoiceCreate(ctx));
    bindFinanceBody(wrap,ctx);
  }

  function invoicePanel(ctx){
    return `${ctx.invoices.length?`<section class="tos-com-section"><div class="tos-com-section-head"><div><h3>Invoices</h3><p>Tap an invoice to manage status and payments.</p></div></div><div class="tos-com-list">${ctx.invoices.map(i=>invoiceCard(i,ctx)).join('')}</div></section>`:emptyState('No invoices yet','Create an invoice from a job with an agreed value.')}`;
  }

  function invoiceCard(i,ctx){
    const job=ctx.jobs.find(j=>j.id===i.job_id),customer=ctx.customers.find(c=>c.id===i.customer_id),paid=paidFor(i.id,ctx),out=Math.max(0,num(i.total)-paid),status=displayInvoiceStatus(i,out);
    return `<article class="tos-com-card tos-com-clickable" data-com-invoice="${esc(i.id)}"><div class="tos-com-card-main"><div class="tos-com-card-top"><div><strong>${esc(i.invoice_number||'Invoice')}</strong><small>${esc(job?.title||'Job')} · ${esc(customer?.name||'Customer')}</small></div>${statusChip(status)}</div><div class="tos-com-card-money">${money.format(num(i.total))}</div><div class="tos-com-card-meta"><span>Paid ${money.format(paid)}</span><span>Due ${i.due_date?formatDate(i.due_date):'—'}</span><span>${out>0?`${money.format(out)} due`:'Paid in full'}</span></div></div><div class="tos-com-card-actions"><button type="button" class="tos-com-link">Manage</button></div></article>`;
  }

  function profitPanel(ctx){
    if(!ctx.profitability.length)return emptyState('No profit data yet','Add job values and approve timesheets to build actual job profit.');
    return `<section class="tos-com-section"><div class="tos-com-section-head"><div><h3>Job profit</h3><p>Agreed net value less actual labour and job costs.</p></div></div><div class="tos-com-profit-list">${ctx.profitability.map(p=>profitCard(p,ctx)).join('')}</div></section>`;
  }

  function profitCard(p,ctx){
    const job=ctx.jobs.find(j=>j.id===p.job_id),positive=num(p.gross_profit)>=0;
    return `<article class="tos-com-profit-card"><div class="tos-com-profit-head"><div><strong>${esc(job?.title||'Job')}</strong><small>${esc(job?.address||'')}</small></div><span class="${positive?'positive':'negative'}">${money.format(num(p.gross_profit))}</span></div><div class="tos-com-profit-metrics"><div><span>Net value</span><strong>${money.format(num(p.agreed_value))}</strong></div><div><span>Actual costs</span><strong>${money.format(num(p.labour_cost)+num(p.material_cost)+num(p.expense_cost))}</strong></div><div><span>Margin</span><strong>${num(p.margin_percent).toFixed(1)}%</strong></div></div><button type="button" class="tos-com-secondary full" data-com-add-cost="${esc(p.job_id)}">Add material cost</button></article>`;
  }

  function bindFinanceBody(wrap,ctx){
    wrap.querySelectorAll('[data-com-invoice]').forEach(card=>card.addEventListener('click',()=>openInvoiceDetail(card.dataset.comInvoice,ctx)));
    wrap.querySelectorAll('[data-com-add-cost]').forEach(b=>b.addEventListener('click',()=>openMaterialCost(b.dataset.comAddCost,ctx)));
  }

  function openInvoiceCreate(ctx){
    const activeInvoiceJobs=new Set(ctx.invoices.filter(i=>i.status!=='void'&&i.job_id).map(i=>i.job_id));
    const eligible=ctx.jobs.filter(j=>num(j.agreed_value)>0&&!activeInvoiceJobs.has(j.id));
    const overlay=sheet('NEW INVOICE','Create an invoice','Choose a job and the due date.');
    const body=overlay.querySelector('.tos-com-sheet-body');
    body.innerHTML=eligible.length?`<form id="tos-com-invoice-form" class="tos-com-form"><div class="tos-com-form-section"><label>Job<select name="jobId" required><option value="">Choose a job…</option>${eligible.map(j=>`<option value="${esc(j.id)}">${esc(j.title)} · ${money.format(num(j.agreed_value))} net</option>`).join('')}</select></label><label>Due date<input name="dueDate" type="date" value="${futureIso(14)}" required></label></div><div class="tos-com-info-box">TradeOS creates the invoice from the job's agreed value. Jobs created from a quote keep the quote VAT.</div><div class="tos-com-form-error" data-form-error hidden></div><button class="tos-com-save" type="submit">Create invoice</button></form>`:emptyState('No jobs ready to invoice','A job needs an agreed value and must not already have an active invoice.');
    document.body.appendChild(overlay);
    body.querySelector('#tos-com-invoice-form')?.addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,fd=new FormData(form),btn=form.querySelector('.tos-com-save'),err=form.querySelector('[data-form-error]');
      if(!fd.get('jobId')){showFormError(err,'Choose a job first.');return;}
      await busyButton(btn,'Creating…',async()=>{
        const r=await client.rpc('create_invoice_from_job',{target_job:fd.get('jobId'),invoice_due_date:fd.get('dueDate')||null});if(r.error)throw r.error;
        closeSheet();toast('Invoice created');await reload('finance');
      },err);
    });
  }

  function openInvoiceDetail(id,ctx){
    const i=ctx.invoices.find(x=>x.id===id);if(!i)return;
    const job=ctx.jobs.find(j=>j.id===i.job_id),customer=ctx.customers.find(c=>c.id===i.customer_id),items=ctx.items.filter(x=>x.invoice_id===i.id),payments=ctx.payments.filter(x=>x.invoice_id===i.id),paid=paidFor(i.id,ctx),out=Math.max(0,num(i.total)-paid),status=displayInvoiceStatus(i,out);
    const overlay=sheet('INVOICE',i.invoice_number||'Invoice',`${job?.title||'Job'}${customer?.name?` · ${customer.name}`:''}`);
    overlay.querySelector('.tos-com-sheet-body').innerHTML=`<div class="tos-com-detail-block"><div class="tos-com-detail-row"><span>Status</span>${statusChip(status)}</div><div class="tos-com-detail-row"><span>Due date</span><strong>${i.due_date?formatDate(i.due_date):'Not set'}</strong></div><div class="tos-com-detail-row"><span>Outstanding</span><strong>${money.format(out)}</strong></div></div><div class="tos-com-breakdown">${items.length?items.map(x=>`<div><span>${esc(x.description)}${num(x.quantity)!==1?` × ${num(x.quantity)}`:''}</span><strong>${money.format(num(x.line_total))}</strong></div>`).join(''):''}<div><span>Net</span><strong>${money.format(num(i.subtotal))}</strong></div><div><span>VAT</span><strong>${money.format(num(i.vat))}</strong></div><div class="total"><span>Total</span><strong>${money.format(num(i.total))}</strong></div></div>${payments.length?`<div class="tos-com-payment-history"><h4>Payments</h4>${payments.map(p=>`<div><span>${formatDate(p.paid_at)}${p.method?` · ${esc(p.method)}`:''}</span><strong>${money.format(num(p.amount))}</strong></div>`).join('')}</div>`:''}<div class="tos-com-sheet-actions">${i.status==='draft'?'<button class="tos-com-secondary" type="button" data-invoice-send>Mark sent</button>':''}${out>0&&i.status!=='void'?'<button class="tos-com-save" type="button" data-invoice-pay>Record payment</button>':''}</div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-invoice-send]')?.addEventListener('click',e=>markInvoiceSent(i.id,e.currentTarget));
    overlay.querySelector('[data-invoice-pay]')?.addEventListener('click',()=>{closeSheet();openPaymentForm(i,ctx,out);});
  }

  async function markInvoiceSent(id,button){
    await busyButton(button,'Saving…',async()=>{const r=await client.rpc('update_invoice_status',{target_invoice:id,next_status:'sent'});if(r.error)throw r.error;closeSheet();toast('Invoice marked sent');await reload('finance');});
  }

  function openPaymentForm(invoice,ctx,outstanding){
    const overlay=sheet('PAYMENT','Record payment',invoice.invoice_number||'Invoice');
    const body=overlay.querySelector('.tos-com-sheet-body');
    body.innerHTML=`<form id="tos-com-payment-form" class="tos-com-form"><div class="tos-com-form-section"><label>Amount (£)<input name="amount" type="number" inputmode="decimal" min="0.01" max="${outstanding.toFixed(2)}" step="0.01" value="${outstanding.toFixed(2)}" required></label><label>Method<select name="method"><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Other</option></select></label><label>Reference<input name="reference" placeholder="Optional"></label></div><div class="tos-com-info-box">Outstanding: ${money.format(outstanding)}</div><div class="tos-com-form-error" data-form-error hidden></div><button class="tos-com-save" type="submit">Save payment</button></form>`;
    document.body.appendChild(overlay);
    body.querySelector('#tos-com-payment-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,fd=new FormData(form),btn=form.querySelector('.tos-com-save'),err=form.querySelector('[data-form-error]'),amount=num(fd.get('amount'));
      if(amount<=0||amount>outstanding+.005){showFormError(err,'Enter an amount up to the outstanding balance.');return;}
      await busyButton(btn,'Saving…',async()=>{const r=await client.rpc('record_invoice_payment',{target_invoice:invoice.id,payment_amount:amount,payment_method:nullable(fd.get('method')),payment_reference:nullable(fd.get('reference'))});if(r.error)throw r.error;closeSheet();toast('Payment recorded');await reload('finance');},err);
    });
  }

  function openMaterialCost(jobId,ctx){
    const job=ctx.jobs.find(j=>j.id===jobId);if(!job)return;
    const overlay=sheet('JOB COST',job.title,'Add a material cost to actual job profit.');
    const body=overlay.querySelector('.tos-com-sheet-body');
    body.innerHTML=`<form id="tos-com-material-form" class="tos-com-form"><div class="tos-com-form-section"><label>Description<input name="description" required placeholder="e.g. RCBOs"></label><div class="tos-com-grid"><label>Quantity<input name="quantity" type="number" inputmode="decimal" min="0.01" step="0.01" value="1" required></label><label>Unit cost (£)<input name="unitCost" type="number" inputmode="decimal" min="0" step="0.01" required></label></div></div><div class="tos-com-form-error" data-form-error hidden></div><button class="tos-com-save" type="submit">Add cost</button></form>`;
    document.body.appendChild(overlay);
    body.querySelector('#tos-com-material-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,fd=new FormData(form),btn=form.querySelector('.tos-com-save'),err=form.querySelector('[data-form-error]');
      await busyButton(btn,'Saving…',async()=>{const r=await client.rpc('add_job_material',{target_company:ctx.companyId,target_job:jobId,item_description:String(fd.get('description')||'').trim(),item_quantity:num(fd.get('quantity')),item_unit_cost:num(fd.get('unitCost'))});if(r.error)throw r.error;closeSheet();toast('Material cost added');await reload('finance');},err);
    });
  }

  async function reload(view){
    const wrap=document.querySelector('main.wrap');if(!wrap||currentView()!==view)return;
    try{const ctx=await loadContext();currentCtx=ctx;if(view==='quotes')drawQuotes(wrap,ctx);else drawFinance(wrap,ctx);}catch(err){toast(err?.message||'Could not refresh',true);}
  }

  function sheet(kicker,title,description){
    const overlay=document.createElement('div');overlay.className='tos-com-sheet';
    overlay.innerHTML=`<div class="tos-com-sheet-panel" role="dialog" aria-modal="true"><div class="tos-com-sheet-handle"></div><div class="tos-com-sheet-head"><div><p class="eyebrow">${esc(kicker)}</p><h3>${esc(title)}</h3>${description?`<p>${esc(description)}</p>`:''}</div><button type="button" class="tos-com-sheet-close" aria-label="Close">×</button></div><div class="tos-com-sheet-body"></div></div>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeSheet();});overlay.querySelector('.tos-com-sheet-close').addEventListener('click',closeSheet);return overlay;
  }
  function closeSheet(){document.querySelector('.tos-com-sheet')?.remove();document.body.classList.remove('tos-com-sheet-open');}
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

  async function busyButton(button,label,fn,errorBox){
    if(!button||button.disabled)return;
    const old=button.textContent;button.disabled=true;button.textContent=label;
    if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
    try{await fn();}catch(err){if(errorBox)showFormError(errorBox,err?.message||'Something went wrong.');else toast(err?.message||'Something went wrong.',true);}finally{if(button.isConnected){button.disabled=false;button.textContent=old;}}
  }

  function showFormError(el,message){if(!el)return;el.textContent=message;el.hidden=false;}
  function toast(message,error=false){document.querySelector('.tos-com-toast')?.remove();const t=document.createElement('div');t.className=`tos-com-toast${error?' error':''}`;t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2800);}
  function statusChip(status){const s=String(status||'draft').toLowerCase().replace(/_/g,' ');return `<span class="tos-com-status ${esc(s.replace(/\s+/g,'-'))}">${esc(titleCase(s))}</span>`;}
  function displayInvoiceStatus(i,out){if(i.status==='paid'||out<=.005)return 'paid';if(i.status==='void')return 'void';if(i.due_date&&new Date(`${i.due_date}T23:59:59`).getTime()<Date.now())return 'overdue';return i.status||'draft';}
  function paidFor(invoiceId,ctx){return sum(ctx.payments.filter(p=>p.invoice_id===invoiceId).map(p=>num(p.amount)));}
  function emptyState(title,detail){return `<div class="tos-com-empty"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;}
  function nullable(v){const s=String(v??'').trim();return s||null;}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function sum(values){return values.reduce((a,b)=>a+num(b),0);}
  function titleCase(v){return String(v||'').replace(/\b\w/g,c=>c.toUpperCase());}
  function formatDate(v){if(!v)return '—';const d=/^\d{4}-\d{2}-\d{2}$/.test(String(v))?new Date(`${v}T12:00:00`):new Date(v);return Number.isNaN(d.getTime())?String(v):dateFmt.format(d);}
  function futureIso(days){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function setText(root,selector,text){const el=root.querySelector(selector);if(el)el.textContent=text;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
