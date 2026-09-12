(()=>{
  let lastMode='';
  let lastOptions='';
  let poll=null;

  function start(){
    new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','class']});
    sync();
    poll=setInterval(sync,1000);
  }

  function sync(){
    const shell=document.querySelector('.tos-ts');
    const hero=shell?.querySelector('.tos-ts-hero');
    const timer=shell?.querySelector('.tos-live-timer-v2');
    if(!shell||!hero||!timer)return;

    let hub=hero.querySelector('.tos-time-entry-hub');
    if(!hub){
      hub=document.createElement('section');
      hub.className='tos-time-entry-hub';
      hero.appendChild(hub);
    }
    shell.classList.add('tos-time-entry-hub-ready');

    const originalStop=timer.querySelector('#tos-stop-live');
    const originalStart=timer.querySelector('#tos-start-live');
    const originalSelect=timer.querySelector('#tos-timer-job');
    const manualButton=shell.querySelector('#tos-add');
    const locked=!!shell.querySelector('.tos-status.approved');

    if(originalStop){
      const job=timer.querySelector('.tos-running-job strong')?.textContent?.trim()||'Current job';
      const elapsed=timer.querySelector('#tos-elapsed')?.textContent?.trim()||'00:00:00';
      const mode=`running:${job}:${elapsed}:${locked}`;
      if(mode!==lastMode){
        lastMode=mode;
        hub.innerHTML=`
          <div class="tos-time-entry-hub-head"><div><span class="tos-time-entry-kicker">ADD TIME</span><strong>${esc(job)}</strong><small>Timer running · <span data-hub-elapsed>${esc(elapsed)}</span></small></div><span class="tos-time-entry-live"><i></i> LIVE</span></div>
          <div class="tos-time-entry-actions running"><button type="button" class="tos-hub-stop">Stop timer</button><button type="button" class="tos-hub-manual" ${manualButton?.disabled||locked?'disabled':''}>Add manually</button></div>`;
        hub.querySelector('.tos-hub-stop')?.addEventListener('click',()=>originalStop.click());
        hub.querySelector('.tos-hub-manual')?.addEventListener('click',()=>openManual(null));
      }else{
        const el=hub.querySelector('[data-hub-elapsed]');if(el)el.textContent=elapsed;
      }
      return;
    }

    if(!originalSelect||!originalStart){
      hub.innerHTML='<div class="tos-time-entry-hub-head"><div><span class="tos-time-entry-kicker">ADD TIME</span><strong>Loading jobs…</strong></div></div>';
      lastMode='loading';
      return;
    }

    const opts=[...originalSelect.options].map(o=>({value:o.value,label:o.textContent||'Job'}));
    const sig=opts.map(o=>`${o.value}:${o.label}`).join('|');
    const selected=hub.querySelector('#tos-hub-job')?.value||originalSelect.value||opts[0]?.value||'';
    const mode=`ready:${sig}:${locked}`;
    if(mode!==lastMode||sig!==lastOptions){
      lastMode=mode;lastOptions=sig;
      hub.innerHTML=`
        <div class="tos-time-entry-hub-head"><div><span class="tos-time-entry-kicker">ADD TIME</span><strong>How are you logging it?</strong><small>Choose the job once, then start a timer or enter the time yourself.</small></div></div>
        <label class="tos-time-entry-job"><span>Job</span><select id="tos-hub-job" ${locked?'disabled':''}>${opts.map(o=>`<option value="${esc(o.value)}" ${o.value===selected?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>
        <div class="tos-time-entry-actions"><button type="button" class="tos-hub-start" ${locked?'disabled':''}>▶ Start timer</button><button type="button" class="tos-hub-manual" ${manualButton?.disabled||locked?'disabled':''}>＋ Add manually</button></div>`;
      hub.querySelector('.tos-hub-start')?.addEventListener('click',()=>{
        const id=hub.querySelector('#tos-hub-job')?.value;
        if(id){originalSelect.value=id;originalSelect.dispatchEvent(new Event('change',{bubbles:true}));}
        originalStart.click();
      });
      hub.querySelector('.tos-hub-manual')?.addEventListener('click',()=>openManual(hub.querySelector('#tos-hub-job')?.value||null));
    }
  }

  function openManual(jobId){
    const add=document.querySelector('.tos-ts #tos-add');
    if(!add||add.disabled)return;
    add.click();
    if(!jobId)return;
    setTimeout(()=>{
      const select=document.querySelector('.tos-sheet select[name="job"]');
      if(select){select.value=jobId;select.dispatchEvent(new Event('change',{bubbles:true}));}
    },40);
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
