(()=>{
  let queued=false;
  let lastRoot=null;

  const labels={
    home:{title:'Command centre'},
    jobs:{title:'Jobs'},
    quotes:{title:'Quotes'},
    finance:{title:'Finance'},
    schedule:{title:'Schedule'},
    timesheets:{title:'Timesheets'},
    team:{title:'Team'}
  };

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  function enhance(){
    const wrap=document.querySelector('main.wrap');
    if(!wrap)return;
    const view=currentView();
    wrap.dataset.productView=view;
    document.body.classList.add('tos-product-v2');

    const hero=wrap.querySelector(':scope > .hero');
    if(!hero)return;
    if(hero.dataset.v2Enhanced===view && wrap.querySelector(`.tos-page-tools[data-tools-view="${view}"]`))return;

    wrap.querySelectorAll(':scope > .tos-page-tools').forEach(x=>x.remove());
    hero.dataset.v2Enhanced=view;
    const tools=buildTools(view,wrap);
    if(tools)hero.insertAdjacentElement('afterend',tools);
    polishHeadings(view,wrap);
  }

  function currentView(){
    const active=[...document.querySelectorAll('.bottom-nav [data-nav].active')].find(x=>!x.classList.contains('modern-more'));
    if(active?.dataset.nav)return active.dataset.nav;
    const scheduleTab=document.querySelector('[data-schedule-tab].active');
    if(scheduleTab)return 'schedule';
    return 'home';
  }

  function buildTools(view,wrap){
    const box=document.createElement('div');
    box.className='tos-page-tools';
    box.dataset.toolsView=view;

    if(view==='home'){
      box.innerHTML=`<div class="tos-quick-actions">
        ${quick('quotes','＋','New quote',true)}
        ${quick('timesheets','◷','Log time')}
        ${quick('jobs','▣','Jobs')}
        ${quick('finance','£','Finance')}
      </div>`;
      bindQuick(box);
      return box;
    }

    if(view==='jobs'){
      box.innerHTML=`<div class="tos-quick-actions">${quick('timesheets','◷','Log time',true)}${quick('schedule','▦','Schedule')}${quick('quotes','＋','New quote')}</div>${filterMarkup('Search jobs…',['All','Booked','In progress','Complete'])}`;
      bindQuick(box);bindListFilter(box,wrap,'jobs');return box;
    }

    if(view==='quotes'){
      box.innerHTML=`<div class="tos-quick-actions"><button class="tos-quick primary" type="button" data-v2-scroll="quote"><span class="tos-qicon">＋</span>New quote</button>${quick('jobs','▣','Jobs')}</div>${filterMarkup('Search quotes…',['All','Draft','Accepted'])}`;
      bindQuick(box);
      box.querySelector('[data-v2-scroll="quote"]')?.addEventListener('click',()=>scrollToForm(wrap));
      bindListFilter(box,wrap,'quotes');return box;
    }

    if(view==='finance'){
      box.innerHTML=`<div class="tos-quick-actions">
        <button class="tos-quick primary" type="button" data-finance-jump="invoice"><span class="tos-qicon">£</span>Invoices</button>
        <button class="tos-quick" type="button" data-finance-jump="profit"><span class="tos-qicon">↗</span>Job profit</button>
        ${quick('quotes','＋','New quote')}
      </div>`;
      bindQuick(box);
      box.querySelectorAll('[data-finance-jump]').forEach(btn=>btn.addEventListener('click',()=>jumpHeading(wrap,btn.dataset.financeJump)));
      return box;
    }

    if(view==='schedule'){
      box.innerHTML=`<div class="tos-quick-actions">${quick('timesheets','◷','Timesheets',true)}<button class="tos-quick" type="button" data-v2-today><span class="tos-qicon">●</span>Today</button>${quick('jobs','▣','All jobs')}</div>`;
      bindQuick(box);
      box.querySelector('[data-v2-today]')?.addEventListener('click',()=>clickByText(wrap,/today/i));
      return box;
    }

    if(view==='timesheets'){
      box.innerHTML=`<div class="tos-quick-actions">${quick('jobs','▣','Jobs',true)}${quick('schedule','▦','Schedule')}</div>`;
      bindQuick(box);return box;
    }

    if(view==='team'){
      box.innerHTML=`<div class="tos-quick-actions">${quick('timesheets','◷','Timesheets',true)}${quick('schedule','▦','Schedule')}${quick('finance','£','Finance')}</div>`;
      bindQuick(box);return box;
    }
    return null;
  }

  function quick(target,icon,label,primary=false){
    if(['quotes','finance'].includes(target)&&!document.querySelector(`.bottom-nav [data-nav="${target}"]`))return '';
    return `<button class="tos-quick${primary?' primary':''}" type="button" data-v2-nav="${target}"><span class="tos-qicon">${icon}</span>${label}</button>`;
  }

  function bindQuick(box){
    box.querySelectorAll('[data-v2-nav]').forEach(btn=>btn.addEventListener('click',()=>{
      const target=document.querySelector(`.bottom-nav [data-nav="${cssEsc(btn.dataset.v2Nav)}"]`);
      target?.click();
    }));
  }

  function filterMarkup(placeholder,pills){
    return `<div class="tos-filterbar"><div class="tos-search"><input type="search" inputmode="search" autocomplete="off" placeholder="${placeholder}" data-v2-search></div><div class="tos-filter-pills">${pills.map((p,i)=>`<button class="tos-filter-pill${i===0?' active':''}" type="button" data-v2-filter="${p.toLowerCase()}">${p}</button>`).join('')}</div></div>`;
  }

  function bindListFilter(box,wrap,type){
    const input=box.querySelector('[data-v2-search]');
    const pills=[...box.querySelectorAll('[data-v2-filter]')];
    let filter='all';
    const apply=()=>{
      const query=(input?.value||'').trim().toLowerCase();
      const items=findListItems(wrap,box);
      let visible=0;
      items.forEach(item=>{
        const text=(item.textContent||'').toLowerCase();
        const status=(item.querySelector('.status')?.textContent||'').trim().toLowerCase();
        const matchesQuery=!query||text.includes(query);
        const matchesFilter=filter==='all'||status.includes(filter)||text.includes(filter);
        const show=matchesQuery&&matchesFilter;
        item.style.display=show?'':'none';
        if(show)visible++;
      });
      updateNoResults(wrap,box,visible,items.length,type);
    };
    input?.addEventListener('input',apply);
    pills.forEach(btn=>btn.addEventListener('click',()=>{
      pills.forEach(x=>x.classList.remove('active'));btn.classList.add('active');filter=btn.dataset.v2Filter||'all';apply();
    }));
  }

  function findListItems(wrap,tools){
    return [...wrap.querySelectorAll('.list .item')].filter(item=>!tools.contains(item));
  }

  function updateNoResults(wrap,tools,visible,total,type){
    let empty=wrap.querySelector(':scope > .tos-empty-filter');
    if(total>0&&visible===0){
      if(!empty){empty=document.createElement('div');empty.className='tos-empty-filter';tools.insertAdjacentElement('afterend',empty);}
      empty.textContent=`No ${type} match that search.`;
    }else empty?.remove();
  }

  function scrollToForm(wrap){
    const form=wrap.querySelector('form');
    if(form)form.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function jumpHeading(wrap,kind){
    const pattern=kind==='invoice'?/invoice/i:/profit|margin|job profit/i;
    const h=[...wrap.querySelectorAll('h2,h3')].find(x=>pattern.test(x.textContent||''));
    h?.closest('.section,.card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function clickByText(root,pattern){
    const el=[...root.querySelectorAll('button')].find(b=>pattern.test((b.textContent||'').trim()));
    el?.click();
  }

  function polishHeadings(view,wrap){
    const hero=wrap.querySelector(':scope > .hero');
    const title=hero?.querySelector('h2');
    if(!title)return;
    if(view==='home'&&!title.dataset.v2copy){
      title.dataset.v2copy='1';
      title.textContent='Everything you need to run today.';
      const sub=hero.querySelector('.sub');
      if(sub)sub.textContent='Jobs, timesheets, money and the next action — all in one place.';
    }
  }

  function cssEsc(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
