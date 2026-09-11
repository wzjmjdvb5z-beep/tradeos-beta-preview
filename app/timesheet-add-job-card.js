(()=>{
  let queued=false;

  function start(){
    new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
    queue();
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance();});
  }

  function enhance(){
    const section=document.querySelector('.tos-ts .tos-day-section');
    if(!section)return;

    const original=section.querySelector('#tos-add');
    const list=section.querySelector('.tos-entry-list');
    if(!original||!list)return;

    original.classList.add('tos-add-original-hidden');

    const empty=section.querySelector('.tos-empty');
    if(empty && empty.innerHTML.includes('+ Add time')){
      empty.innerHTML=empty.innerHTML.replace('Tap <strong>+ Add time</strong> to add the first block.','Tap <strong>Add a job</strong> to add the first time block.');
    }

    let card=section.querySelector('.tos-add-job-card');
    if(!card){
      card=document.createElement('button');
      card.type='button';
      card.className='tos-add-job-card';
      card.innerHTML=`
        <span class="tos-add-job-icon" aria-hidden="true">+</span>
        <span class="tos-add-job-copy">
          <strong>Add a job</strong>
          <small>Choose a job, then add start & finish time</small>
        </span>
        <span class="tos-add-job-arrow" aria-hidden="true">›</span>`;
      list.insertAdjacentElement('afterend',card);
      card.addEventListener('click',()=>{
        if(card.disabled)return;
        original.click();
      });
    }

    const locked=original.disabled;
    card.disabled=locked;
    card.classList.toggle('is-locked',locked);
    const title=card.querySelector('.tos-add-job-copy strong');
    const sub=card.querySelector('.tos-add-job-copy small');
    if(locked){
      if(title)title.textContent='Week finalised';
      if(sub)sub.textContent='Reopen the week to add another job';
    }else{
      if(title)title.textContent='Add a job';
      if(sub)sub.textContent='Choose a job, then add start & finish time';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();