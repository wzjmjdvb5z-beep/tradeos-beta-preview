(()=>{
  let queued=false;
  const rendered=new WeakMap();

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  function enhance(){
    const wrap=document.querySelector('main.wrap');
    const homeActive=document.querySelector('.bottom-nav [data-nav="home"].active');
    if(!wrap||!homeActive)return;
    const hero=wrap.querySelector(':scope > .hero');
    if(!hero)return;

    wrap.dataset.homeSimple='1';
    const title=hero.querySelector('h2');
    const sub=hero.querySelector('.sub');
    if(title&&title.textContent!=='Today.')title.textContent='Today.';
    if(sub&&sub.textContent!=='The essentials, nothing else.')sub.textContent='The essentials, nothing else.';

    const stats=[...wrap.querySelectorAll(':scope > .stats .stat')].map(card=>({
      label:(card.querySelector('span')?.textContent||'').trim(),
      value:(card.querySelector('strong')?.textContent||'').trim()
    })).filter(x=>x.label||x.value);

    const primary=stats[0]||{label:'Live jobs',value:'—'};
    const useful=stats.find(x=>/outstanding|my week/i.test(x.label))||stats[2]||stats[1]||{label:'This week',value:'—'};
    const hasQuotes=!!document.querySelector('.bottom-nav [data-nav="quotes"]');

    let panel=wrap.querySelector(':scope > .tos-home-simple');
    if(!panel){
      panel=document.createElement('section');
      panel.className='tos-home-simple';
      hero.insertAdjacentElement('afterend',panel);
    }

    const signature=JSON.stringify([primary,useful,hasQuotes]);
    if(rendered.get(panel)===signature)return;
    rendered.set(panel,signature);
    panel.innerHTML=`
      <div class="tos-home-actions">
        <button class="tos-home-action primary" type="button" data-home-nav="timesheets"><span class="tos-home-action-icon">◷</span><span>Log time</span></button>
        <button class="tos-home-action" type="button" data-home-nav="${hasQuotes?'quotes':'jobs'}"><span class="tos-home-action-icon">${hasQuotes?'＋':'▣'}</span><span>${hasQuotes?'New quote':'View jobs'}</span></button>
      </div>
      <div class="tos-home-card">
        <div class="tos-home-card-head"><strong>At a glance</strong><span>Today</span></div>
        <div class="tos-home-metrics">
          ${metric(primary)}
          ${metric(useful)}
        </div>
        <p class="tos-home-hint">Jobs, quotes, finance and team details stay in their own sections so Home stays quick and easy to scan.</p>
      </div>`;

    panel.querySelectorAll('[data-home-nav]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.homeNav==='quotes')window.__tradeosOpenNewQuote=true;
      document.querySelector(`.bottom-nav [data-nav="${cssEsc(btn.dataset.homeNav)}"]`)?.click();
    }));
  }

  function metric(item){return `<div class="tos-home-metric"><small>${esc(item.label||'')}</small><strong>${esc(item.value||'—')}</strong></div>`;}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function cssEsc(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}

  new MutationObserver(mutations=>{if(mutations.some(m=>m.type!=='attributes'||m.oldValue!==m.target.getAttribute(m.attributeName)))schedule();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
