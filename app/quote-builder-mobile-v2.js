(()=>{
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}
  function enhance(){
    const sheet=document.querySelector('.tos-br-quote-sheet');
    if(!sheet||sheet.dataset.mobilePolish==='1')return;
    const panel=sheet.querySelector('.tos-br-quote-panel'),form=sheet.querySelector('[data-q-form]');
    if(!panel||!form)return;
    sheet.dataset.mobilePolish='1';
    panel.scrollTop=0;
    requestAnimationFrame(()=>{panel.scrollTop=0;});

    const select=form.elements.savedCustomer;
    if(!select)return;
    const names=['customerName','customerEmail','customerPhone','customerAddress'];
    const fields=names.map(n=>form.elements[n]?.closest('.tos-br-field')).filter(Boolean);
    const anchor=select.closest('.tos-br-field');
    if(!anchor||!fields.length)return;

    const summary=document.createElement('div');
    summary.className='tos-br-saved-customer';
    summary.hidden=true;
    summary.innerHTML='<div><strong data-customer-summary-name>Saved customer</strong><span data-customer-summary-detail></span></div><button type="button" class="tos-br-link" data-edit-customer>Edit details</button>';
    anchor.insertAdjacentElement('afterend',summary);
    let editing=false;

    const sync=()=>{
      const hasSaved=!!select.value;
      const name=(form.elements.customerName?.value||'').trim()||'Saved customer';
      const detail=[form.elements.customerEmail?.value,form.elements.customerPhone?.value,form.elements.customerAddress?.value].map(v=>String(v||'').trim()).filter(Boolean).join(' · ');
      summary.querySelector('[data-customer-summary-name]').textContent=name;
      summary.querySelector('[data-customer-summary-detail]').textContent=detail||'Customer details saved';
      summary.hidden=!hasSaved||editing;
      fields.forEach(f=>{f.hidden=hasSaved&&!editing;});
    };

    summary.querySelector('[data-edit-customer]').addEventListener('click',()=>{editing=true;sync();form.elements.customerName?.focus();});
    select.addEventListener('change',()=>{editing=false;requestAnimationFrame(sync);});
    names.forEach(n=>form.elements[n]?.addEventListener('input',()=>{if(!summary.hidden)sync();}));
    requestAnimationFrame(sync);
  }
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
