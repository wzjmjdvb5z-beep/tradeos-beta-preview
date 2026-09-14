(()=>{
  let queued=false;
  let activeView='';

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      enhance();
    });
  }

  function enhance(){
    const wrap=document.querySelector('main.wrap');
    if(!wrap)return;
    const view=currentView();
    if(!view)return;
    cleanupDetachedSheet(view);
    activeView=view;
    document.body.classList.add('tos-product-clean');
    wrap.dataset.cleanView=view;

    polishHero(view,wrap);
    if(view==='quotes')cleanQuotes(wrap);
    if(view==='finance')cleanFinance(wrap);
    if(view==='team')cleanTeam(wrap);
    if(view==='schedule')cleanSchedule(wrap);
    if(view==='jobs')cleanJobs(wrap);
    if(view==='timesheets')cleanTimesheets(wrap);
  }

  function currentView(){
    if(document.querySelector('.tos-schedule-shell'))return 'schedule';
    const active=[...document.querySelectorAll('.bottom-nav [data-nav].active')]
      .find(x=>!x.classList.contains('modern-more'));
    return active?.dataset?.nav||'';
  }

  function polishHero(view,wrap){
    const hero=wrap.querySelector(':scope > .hero, :scope > .tos-schedule-shell .tos-schedule-hero');
    if(!hero)return;
    const copy={
      jobs:['Jobs','Everything you are working on, in one place.'],
      quotes:['Quotes','Create a price, send it, then turn it into a job.'],
      finance:['Finance','See what jobs made and what you are still owed.'],
      team:['Team','People, rates and timesheet approvals.']
    }[view];
    if(!copy)return;
    const title=hero.querySelector('h2');
    const sub=hero.querySelector('.sub,p:not(.eyebrow)');
    if(title&&title.textContent!==copy[0])title.textContent=copy[0];
    if(sub&&sub.textContent!==copy[1])sub.textContent=copy[1];
  }

  function cleanJobs(wrap){
    wrap.classList.add('tos-clean-jobs');
    const listSection=[...wrap.querySelectorAll('section.card.section')]
      .find(s=>s.querySelector('.item') && !s.querySelector('#jobform'));
    const heading=listSection?.querySelector('.section-head h3');
    if(heading && !heading.dataset.cleanCopy){
      heading.dataset.cleanCopy='1';
      heading.textContent='Your jobs';
    }
  }

  function cleanQuotes(wrap){
    wrap.classList.add('tos-clean-quotes');
    const form=wrap.querySelector('#quoteform');
    const layout=form?.closest('.quote-layout');
    const listSection=[...wrap.querySelectorAll('section.card.section')]
      .find(s=>/saved quotes/i.test(s.querySelector('.section-head h3')?.textContent||''));

    const heading=listSection?.querySelector('.section-head h3');
    if(heading&&heading.textContent!=='Your quotes')heading.textContent='Your quotes';

    if(!layout || layout.dataset.cleanPrepared==='1')return;
    layout.dataset.cleanPrepared='1';
    const placeholder=document.createElement('div');
    placeholder.className='tos-clean-placeholder';
    placeholder.dataset.cleanPlaceholder='quote';
    layout.parentNode?.insertBefore(placeholder,layout);
    placeholder.appendChild(layout);
    layout.hidden=true;

    const trigger=actionCard({
      className:'tos-clean-new-quote',
      icon:'＋',
      title:'New quote',
      detail:'Customer, job details and price',
      action:'Create quote'
    });
    const target=listSection||placeholder;
    target.parentNode?.insertBefore(trigger,target);
    trigger.addEventListener('click',()=>openMovedSheet({
      source:layout,
      placeholder,
      kicker:'NEW QUOTE',
      title:'Create a quote',
      description:'Add the essentials, check the total, then save it.',
      sheetClass:'tos-clean-quote-sheet'
    }));
  }

  function cleanTeam(wrap){
    wrap.classList.add('tos-clean-team');
    const grid=wrap.querySelector('.team-grid');
    const invite=wrap.querySelector('#inviteform');
    if(invite && invite.dataset.cleanPrepared!=='1'){
      invite.dataset.cleanPrepared='1';
      const placeholder=document.createElement('div');
      placeholder.className='tos-clean-placeholder';
      invite.parentNode?.insertBefore(placeholder,invite);
      placeholder.appendChild(invite);
      invite.hidden=true;

      const trigger=actionCard({
        className:'tos-clean-invite',
        icon:'＋',
        title:'Invite a team member',
        detail:'Add an employee or manager to this workspace',
        action:'Invite'
      });
      (grid||placeholder).parentNode?.insertBefore(trigger,grid||placeholder);
      trigger.addEventListener('click',()=>openMovedSheet({
        source:invite,
        placeholder,
        kicker:'TEAM',
        title:'Invite someone',
        description:'Enter their email and choose the access they need.',
        sheetClass:'tos-clean-invite-sheet'
      }));
    }

    const rates=wrap.querySelector('.tos-rates-card');
    if(rates && rates.dataset.cleanPrepared!=='1'){
      rates.dataset.cleanPrepared='1';
      const head=rates.querySelector('.section-head');
      const list=rates.querySelector('.tos-rates-list');
      const note=rates.querySelector('.tos-rate-note');
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='tos-clean-inline-toggle';
      toggle.textContent='Edit rates';
      head?.appendChild(toggle);
      rates.classList.add('tos-clean-collapsed');
      const set=(open)=>{
        rates.classList.toggle('tos-clean-collapsed',!open);
        if(list)list.hidden=!open;
        if(note)note.hidden=!open;
        toggle.textContent=open?'Hide rates':'Edit rates';
        toggle.setAttribute('aria-expanded',String(open));
      };
      set(false);
      toggle.addEventListener('click',()=>set(rates.classList.contains('tos-clean-collapsed')));
    }

    const sections=[...wrap.querySelectorAll('.team-grid > section.card.section')];
    sections.forEach(section=>{
      const h=section.querySelector('.section-head h3');
      if(/members/i.test(h?.textContent||''))h.textContent='People';
      if(/to review/i.test(h?.textContent||''))h.textContent='Timesheets to approve';
    });
  }

  function cleanFinance(wrap){
    wrap.classList.add('tos-clean-finance');
    const summary=wrap.querySelector('.finance-summary');
    summary?.classList.add('tos-clean-finance-summary');

    const sections=[...wrap.querySelectorAll('section.card.section')];
    sections.forEach(section=>{
      const h=section.querySelector('.section-head h3');
      if(/profit by job/i.test(h?.textContent||''))h.textContent='Job profit';
      if(/invoices/i.test(h?.textContent||'')&&h.textContent!=='Invoices')h.textContent='Invoices';
    });

    wrap.querySelectorAll('.finance-card').forEach(card=>{
      if(card.dataset.cleanPrepared==='1')return;
      card.dataset.cleanPrepared='1';
      const metrics=[...card.querySelectorAll('.metric')];
      metrics.forEach(metric=>{
        const label=(metric.querySelector('small')?.textContent||'').trim();
        metric.classList.add(/^(profit|margin)$/i.test(label)?'tos-clean-key-metric':'tos-clean-detail-metric');
      });
      const details=card.querySelectorAll('.tos-clean-detail-metric');
      if(!details.length)return;
      card.classList.add('tos-clean-profit-collapsed');
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='tos-clean-breakdown-toggle';
      toggle.textContent='View breakdown';
      const actions=card.querySelector('.actions');
      if(actions)actions.insertAdjacentElement('afterend',toggle);else card.appendChild(toggle);
      toggle.addEventListener('click',()=>{
        const open=card.classList.toggle('tos-clean-profit-open');
        card.classList.toggle('tos-clean-profit-collapsed',!open);
        toggle.textContent=open?'Hide breakdown':'View breakdown';
      });
    });
  }

  function cleanSchedule(wrap){
    wrap.classList.add('tos-clean-schedule');
    const unscheduled=wrap.querySelector('.tos-unscheduled');
    if(unscheduled)delete unscheduled.dataset.cleanHidden;
  }

  function cleanTimesheets(wrap){
    wrap.classList.add('tos-clean-timesheets');
  }

  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function actionCard({className='',icon='＋',title,detail,action}){
    const button=document.createElement('button');
    button.type='button';
    button.className=`tos-clean-action-card ${className}`.trim();
    button.innerHTML=`<span class="tos-clean-action-icon" aria-hidden="true">${esc(icon)}</span><span class="tos-clean-action-copy"><strong>${esc(title)}</strong><small>${esc(detail)}</small></span><span class="tos-clean-action-label">${esc(action)}</span><span class="tos-clean-action-chevron" aria-hidden="true">›</span>`;
    return button;
  }

  function openMovedSheet({source,placeholder,kicker,title,description,sheetClass=''}){
    closeCleanSheet();
    if(!source||!placeholder)return;
    const overlay=document.createElement('div');
    overlay.className=`tos-clean-sheet ${sheetClass}`.trim();
    overlay.innerHTML=`<div class="tos-clean-sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="tos-clean-sheet-handle"></div><div class="tos-clean-sheet-head"><div><p class="eyebrow">${esc(kicker)}</p><h3>${esc(title)}</h3><p>${esc(description)}</p></div><button class="tos-clean-sheet-close" type="button" aria-label="Close">×</button></div><div class="tos-clean-sheet-content"></div></div>`;
    document.body.appendChild(overlay);
    source.hidden=false;
    overlay.querySelector('.tos-clean-sheet-content')?.appendChild(source);
    document.body.classList.add('tos-clean-sheet-open');

    const close=()=>{
      if(placeholder.isConnected){
        placeholder.appendChild(source);
        source.hidden=true;
      }
      overlay.remove();
      document.body.classList.remove('tos-clean-sheet-open');
    };
    overlay.dataset.cleanView=activeView;
    overlay._cleanPlaceholder=placeholder;
    overlay.querySelector('.tos-clean-sheet-close')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay._cleanClose=close;
  }

  function cleanupDetachedSheet(view){
    const overlay=document.querySelector('.tos-clean-sheet');
    if(!overlay)return;
    const placeholder=overlay._cleanPlaceholder;
    if((placeholder && !placeholder.isConnected) || (overlay.dataset.cleanView && overlay.dataset.cleanView!==view)){
      overlay.remove();
      document.body.classList.remove('tos-clean-sheet-open');
    }
  }

  function closeCleanSheet(){
    const overlay=document.querySelector('.tos-clean-sheet');
    if(!overlay)return;
    if(typeof overlay._cleanClose==='function')overlay._cleanClose();
    else overlay.remove();
    document.body.classList.remove('tos-clean-sheet-open');
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCleanSheet();});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.bottom-nav [data-nav], .modern-more-item'))closeCleanSheet();
  },true);

  new MutationObserver(mutations=>{if(mutations.some(m=>m.type!=='attributes'||m.oldValue!==m.target.getAttribute(m.attributeName)))schedule();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();