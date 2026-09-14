(()=>{
  const icons={
    home:'<svg viewBox="0 0 24 24"><path d="M3.5 10.5 12 3.8l8.5 6.7v9.2a.8.8 0 0 1-.8.8H4.3a.8.8 0 0 1-.8-.8z"/><path d="M9.2 20.5v-6.2h5.6v6.2"/></svg>',
    schedule:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3v3H8z"/></svg>',
    jobs:'<svg viewBox="0 0 24 24"><path d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6"/><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 11.5c5.5 2.6 12.5 2.6 18 0M10 12h4"/></svg>',
    quotes:'<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M14.5 3v4H18M9 11h6M9 15h6"/></svg>',
    timesheets:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
    finance:'<svg viewBox="0 0 24 24"><path d="M4 19h16M6 16V9M11 16V5M16 16v-4"/><path d="m5 7 5-4 4 3 5-4"/></svg>',
    team:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.6 2.3-5.5 5.5-5.5s5 1.9 5.5 5.5"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 14.5c3.1-.4 4.8 1.1 5 4.5"/></svg>',
    more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
    signout:'<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>'
  };
  let scheduled=false;
  const navStates=new WeakMap();
  const descriptions={
    schedule:'Plan jobs and allocate the team',
    timesheets:'Hours, timers and weekly timesheets',
    finance:'Job profit, invoices and payments',
    team:'People, rates and invitations',
    quotes:'Create and manage customer quotes'
  };

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance();});}
  function enhance(){
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    const buttons=[...nav.querySelectorAll('[data-nav]')];
    if(!buttons.length)return;
    const signature=JSON.stringify([document.querySelector('.beta')?.textContent||'',buttons.map(b=>[b.dataset.nav,b.classList.contains('active')])]);
    const previous=navStates.get(nav);
    if(previous?.signature===signature && previous.buttons.length===buttons.length && buttons.every((b,i)=>b===previous.buttons[i]) && (previous.more===null || previous.more.isConnected))return;
    navStates.set(nav,{signature,buttons,more:null});
    buttons.forEach(button=>{
      const key=button.dataset.nav;
      const holder=button.querySelector('b');
      if(holder&&icons[key])holder.innerHTML=icons[key];
      if(key==='timesheets'){
        const label=button.querySelector('span');
        if(label)label.textContent='Timesheets';
      }
      button.classList.remove('modern-hidden');
    });
    nav.querySelector('.modern-more')?.remove();

    const role=(document.querySelector('.beta')?.textContent||'').toLowerCase();
    const worker=!/(owner|admin|manager)/.test(role);
    const primary=worker
      ?['home','timesheets','jobs','schedule']
      :['home','timesheets','jobs','quotes'];
    const available=new Set(buttons.map(x=>x.dataset.nav));
    const actualPrimary=primary.filter(x=>available.has(x));
    buttons.forEach(button=>{if(!actualPrimary.includes(button.dataset.nav))button.classList.add('modern-hidden');});

    const secondary=buttons.filter(button=>!actualPrimary.includes(button.dataset.nav));
    if(!secondary.length)return;
    const activeSecondary=secondary.some(button=>button.classList.contains('active'));
    const more=document.createElement('button');
    more.type='button';
    more.className=`nav modern-more${activeSecondary?' active':''}`;
    more.innerHTML=`<b>${icons.more}</b><span>More</span>`;
    more.addEventListener('click',()=>openMore(secondary));
    nav.appendChild(more);
    navStates.get(nav).more=more;
  }

  function openMore(secondaryButtons){
    closeMore();
    const overlay=document.createElement('div');
    overlay.className='modern-more-sheet';
    const items=secondaryButtons.map(button=>{
      const key=button.dataset.nav;
      const label=key==='schedule'?'Schedule':(button.querySelector('span')?.textContent||pretty(key));
      return `<button class="modern-more-item" data-more-target="${esc(key)}"><span class="modern-more-icon">${icons[key]||icons.more}</span><span><strong>${esc(label)}</strong><small>${esc(descriptions[key]||'Open this section')}</small></span></button>`;
    }).join('');
    overlay.innerHTML=`<div class="modern-more-panel" role="dialog" aria-modal="true" aria-label="More TradeOS sections"><div class="modern-more-handle"></div><h3 class="modern-more-title">More</h3><div class="modern-more-list">${items}<button class="modern-more-item dangerous" data-modern-signout><span class="modern-more-icon">${icons.signout}</span><span><strong>Sign out</strong><small>Sign out of TradeOS on this device</small></span></button></div><button class="btn secondary modern-more-close" type="button">Close</button></div>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeMore();});
    overlay.querySelector('.modern-more-close').addEventListener('click',closeMore);
    overlay.querySelectorAll('[data-more-target]').forEach(item=>item.addEventListener('click',()=>{
      const target=document.querySelector(`.bottom-nav [data-nav="${cssEsc(item.dataset.moreTarget)}"]`);
      closeMore();target?.click();
    }));
    overlay.querySelector('[data-modern-signout]').addEventListener('click',()=>{const logout=document.querySelector('#logout');closeMore();logout?.click();});
    document.body.appendChild(overlay);
  }

  function closeMore(){document.querySelector('.modern-more-sheet')?.remove();}
  function pretty(v){return String(v||'').replace(/(^|[-_])([a-z])/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function cssEsc(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}

  new MutationObserver(mutations=>{if(mutations.some(m=>m.type!=='attributes'||m.oldValue!==m.target.getAttribute(m.attributeName)))schedule();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
