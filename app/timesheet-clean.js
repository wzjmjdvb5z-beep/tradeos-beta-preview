(()=>{
  let selectedDate=null;
  let scheduled=false;
  const dateFmt=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const shortFmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'});

  function start(){
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    schedule();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;mount();});
  }
  function mount(){
    const active=document.querySelector('[data-nav="timesheets"].active');
    const wrap=document.querySelector('main.wrap');
    if(!active||!wrap||wrap.querySelector('.tos-ts'))return;
    const table=wrap.querySelector('.timesheet-wrap table');
    if(!table)return;
    const sourceCard=table.closest('.card.section');
    const oldHero=wrap.querySelector(':scope > .hero');
    if(!sourceCard)return;
    const inputs=[...table.querySelectorAll('[data-hour-job][data-hour-date]')];
    if(!inputs.length)return;
    sourceCard.classList.add('tos-source-hidden');
    oldHero?.classList.add('tos-source-hidden');
    const shell=document.createElement('section');
    shell.className='tos-ts';
    wrap.insertBefore(shell,oldHero||sourceCard);
    render(shell,sourceCard,table);
  }
  function render(shell,sourceCard,table){
    const inputs=[...table.querySelectorAll('[data-hour-job][data-hour-date]')];
    const dayOrder=[];
    const seen=new Set();
    for(const input of inputs){const d=input.dataset.hourDate;if(d&&!seen.has(d)){seen.add(d);dayOrder.push(d)}}
    if(!dayOrder.length)return;
    const today=localIso(new Date());
    if(!selectedDate||!dayOrder.includes(selectedDate))selectedDate=dayOrder.includes(today)?today:dayOrder[0];
    const rows=[...table.querySelectorAll('tbody tr')].map(row=>{
      const rowInputs=[...row.querySelectorAll('[data-hour-job][data-hour-date]')];
      const first=rowInputs[0];
      if(!first)return null;
      return {id:first.dataset.hourJob,title:row.querySelector('.job-col strong')?.textContent?.trim()||'Job',inputs:rowInputs};
    }).filter(Boolean);
    const entries=[];
    for(const row of rows){for(const input of row.inputs){const hours=num(input.value);if(hours>0)entries.push({jobId:row.id,title:row.title,date:input.dataset.hourDate,hours,input})}}
    const dayTotals=Object.fromEntries(dayOrder.map(d=>[d,sum(entries.filter(e=>e.date===d).map(e=>e.hours))]));
    const total=sum(Object.values(dayTotals));
    const selectedEntries=entries.filter(e=>e.date===selectedDate);
    const jobsUsed=new Set(entries.map(e=>e.jobId)).size;
    const status=(sourceCard.querySelector('.weekbar .sub')?.textContent||'Draft').trim();
    const locked=['submitted','approved'].includes(status.toLowerCase());
    const person=sourceCard.querySelector('.weekbar strong')?.textContent?.trim()||'My timesheet';
    const weekLabel=sourceCard.querySelector('.weeklabel')?.textContent?.trim()||`${shortFmt.format(toDate(dayOrder[0]))} – ${shortFmt.format(toDate(dayOrder[6]))}`;
    shell.innerHTML=`
      <div class="tos-ts-hero"><div><p class="eyebrow">TIMESHEETS</p><h2>Log time. Done.</h2><p>Choose a day, add the job and enter the hours.</p></div><span class="tos-status ${esc(status.toLowerCase())}">${esc(status)}</span></div>
      <div class="tos-week-card">
        <div class="tos-week-head">
          <div class="tos-week-person"><strong>${esc(person)}</strong><small>${esc(total?`${fmtHours(total)} hours this week`:'No time entered yet')}</small></div>
          <div class="tos-week-nav"><button class="tos-icon-btn" id="tos-prev" aria-label="Previous week">‹</button><span class="tos-week-label">${esc(weekLabel)}</span><button class="tos-icon-btn" id="tos-next" aria-label="Next week">›</button></div>
        </div>
        <div class="tos-days">${dayOrder.map(d=>dayButton(d,dayTotals[d],d===selectedDate,d===today)).join('')}</div>
      </div>
      <div class="tos-day-section">
        <div class="tos-day-title"><div><h3>${esc(dateFmt.format(toDate(selectedDate)))}</h3><small>${fmtHours(dayTotals[selectedDate]||0)} hours</small></div><button class="tos-add-btn" id="tos-add" ${locked?'disabled':''}>+ Add time</button></div>
        ${locked?`<div class="tos-lock-note">This week is ${esc(status.toLowerCase())} and is locked for editing.</div>`:''}
        <div class="tos-entry-list">${selectedEntries.length?selectedEntries.map(entryCard).join(''):`<div class="tos-empty">No time entered for this day.<br>${locked?'':'Tap <strong>+ Add time</strong> to get started.'}</div>`}</div>
      </div>
      <div class="tos-summary">
        <div class="tos-summary-card"><small>Week total</small><strong>${fmtHours(total)}h</strong></div>
        <div class="tos-summary-card"><small>Selected day</small><strong>${fmtHours(dayTotals[selectedDate]||0)}h</strong></div>
        <div class="tos-summary-card"><small>Jobs used</small><strong>${jobsUsed}</strong></div>
      </div>
      ${locked?`<div class="tos-lock-note">Week status: <strong>${esc(status)}</strong></div>`:`<button class="tos-submit" id="tos-submit" ${total<=0?'disabled':''}>Submit week</button>`}
    `;
    shell.querySelectorAll('[data-tos-date]').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.tosDate;render(shell,sourceCard,table)}));
    shell.querySelector('#tos-prev')?.addEventListener('click',()=>sourceCard.querySelector('#prev')?.click());
    shell.querySelector('#tos-next')?.addEventListener('click',()=>sourceCard.querySelector('#next')?.click());
    shell.querySelector('#tos-submit')?.addEventListener('click',()=>sourceCard.querySelector('#submitweek')?.click());
    shell.querySelector('#tos-add')?.addEventListener('click',()=>openSheet({rows,date:selectedDate}));
    shell.querySelectorAll('[data-tos-edit]').forEach(b=>b.addEventListener('click',()=>{
      const found=selectedEntries.find(e=>e.jobId===b.dataset.tosEdit);
      if(found)openSheet({rows,date:selectedDate,entry:found});
    }));
  }
  function dayButton(isoDate,hours,active,today){
    const d=toDate(isoDate);const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return `<button class="tos-day ${active?'active':''} ${today?'today':''}" data-tos-date="${isoDate}"><span class="dow">${dow}</span><span class="date">${d.getDate()}</span><span class="hours">${hours>0?`${fmtHours(hours)}h`:'–'}</span></button>`;
  }
  function entryCard(e){return `<div class="tos-entry-card"><div class="tos-entry-main"><strong>${esc(e.title)}</strong><small>${esc(fmtDuration(e.hours))}</small></div><div class="tos-entry-side"><span class="tos-entry-hours">${fmtHours(e.hours)}h</span><button class="tos-edit-btn" data-tos-edit="${esc(e.jobId)}">Edit</button></div></div>`}
  function openSheet({rows,date,entry}){
    document.querySelector('.tos-sheet')?.remove();
    const panel=document.createElement('div');panel.className='tos-sheet';
    const hours=entry?Math.floor(entry.hours):0;
    const minutes=entry?Math.round((entry.hours-hours)*60):0;
    panel.innerHTML=`<div class="tos-sheet-panel" role="dialog" aria-modal="true"><div class="tos-sheet-handle"></div><div class="tos-sheet-head"><div><p class="eyebrow">${entry?'EDIT TIME':'ADD TIME'}</p><h3>${esc(dateFmt.format(toDate(date)))}</h3></div><button class="tos-close" aria-label="Close">×</button></div><form class="tos-form" id="tos-time-form"><div class="tos-field"><label>Job</label><select name="job" ${entry?'disabled':''}>${rows.map(r=>`<option value="${esc(r.id)}" ${entry?.jobId===r.id?'selected':''}>${esc(r.title)}</option>`).join('')}</select></div><div class="tos-field"><label>Duration</label><div class="tos-duration"><input name="hours" type="number" min="0" max="24" step="1" inputmode="numeric" value="${hours}" placeholder="Hours"><input name="minutes" type="number" min="0" max="59" step="5" inputmode="numeric" value="${minutes||''}" placeholder="Minutes"></div></div><div class="tos-quick"><button type="button" class="tos-chip" data-mins="30">30m</button><button type="button" class="tos-chip" data-mins="60">1h</button><button type="button" class="tos-chip" data-mins="120">2h</button><button type="button" class="tos-chip" data-mins="240">4h</button><button type="button" class="tos-chip" data-mins="480">8h</button></div><div class="tos-sheet-actions">${entry?'<button type="button" class="tos-delete" id="tos-delete">Remove</button>':'<button type="button" class="tos-delete" id="tos-cancel">Cancel</button>'}<button class="tos-save">Save time</button></div></form></div>`;
    document.body.appendChild(panel);
    const close=()=>panel.remove();
    panel.addEventListener('click',e=>{if(e.target===panel)close()});
    panel.querySelector('.tos-close')?.addEventListener('click',close);
    panel.querySelector('#tos-cancel')?.addEventListener('click',close);
    panel.querySelectorAll('[data-mins]').forEach(b=>b.addEventListener('click',()=>{const mins=Number(b.dataset.mins);panel.querySelector('[name="hours"]').value=String(Math.floor(mins/60));panel.querySelector('[name="minutes"]').value=String(mins%60||'')}));
    panel.querySelector('#tos-delete')?.addEventListener('click',()=>{if(!entry)return;entry.input.value='0';entry.input.dispatchEvent(new Event('change',{bubbles:true}));close()});
    panel.querySelector('#tos-time-form')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),h=Math.max(0,Number(f.get('hours'))||0),m=Math.max(0,Math.min(59,Number(f.get('minutes'))||0)),total=Math.min(24,h+m/60);if(total<=0){alert('Enter some time first.');return}const jobId=entry?.jobId||String(f.get('job')||'');const source=document.querySelector(`[data-hour-job="${cssEscape(jobId)}"][data-hour-date="${date}"]`);if(!source){alert('That job is no longer available for this week.');return}source.value=String(Math.round(total*100)/100);source.dispatchEvent(new Event('change',{bubbles:true}));close()});
  }
  function fmtDuration(h){const mins=Math.round(h*60),hh=Math.floor(mins/60),mm=mins%60;return hh&&mm?`${hh} hr ${mm} min`:hh?`${hh} ${hh===1?'hour':'hours'}`:`${mm} min`}
  function fmtHours(v){const n=Math.round(num(v)*100)/100;return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
  function sum(a){return a.reduce((x,y)=>x+num(y),0)}
  function toDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0)}
  function localIso(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function cssEscape(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/(["\\])/g,'\\$1')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
