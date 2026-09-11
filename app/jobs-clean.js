(()=>{
  let lastForm=null;

  function mount(){
    const wrap=document.querySelector('main.wrap');
    const form=document.querySelector('#jobform');

    if(!form){
      wrap?.classList.remove('jobs-clean-page');
      return;
    }
    if(form===lastForm || form.dataset.jobsCleanMounted==='1')return;
    lastForm=form;
    form.dataset.jobsCleanMounted='1';
    wrap?.classList.add('jobs-clean-page');

    document.querySelector('.jobs-form-sheet')?.remove();
    document.querySelector('.jobs-add-trigger')?.remove();

    const source=form.closest('section.card.section');
    if(!source)return;

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='jobs-add-trigger';
    trigger.innerHTML=`
      <span class="jobs-add-icon" aria-hidden="true">+</span>
      <span class="jobs-add-copy">
        <strong>Add a job</strong>
        <small>Create the job, then assign people or add time.</small>
      </span>
      <span class="jobs-add-chevron" aria-hidden="true">›</span>`;
    source.parentNode.insertBefore(trigger,source);

    const overlay=document.createElement('div');
    overlay.className='jobs-form-sheet';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="jobs-form-panel" role="dialog" aria-modal="true" aria-label="Add a job">
      <div class="jobs-form-handle"></div>
      <div class="jobs-form-head">
        <div><p class="eyebrow">NEW JOB</p><h3>Add a job</h3><p>Enter the essentials now. You can manage the rest from the job afterwards.</p></div>
        <button type="button" class="jobs-form-close" aria-label="Close">×</button>
      </div>
      <div class="jobs-form-content"></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.jobs-form-content')?.appendChild(source);
    source.classList.add('jobs-clean-form-source');
    const oldHead=source.querySelector(':scope > .section-head');
    if(oldHead)oldHead.hidden=true;

    const open=()=>{
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden','false');
      document.body.classList.add('jobs-sheet-open');
    };
    const close=()=>{
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
      document.body.classList.remove('jobs-sheet-open');
    };

    trigger.addEventListener('click',open);
    overlay.querySelector('.jobs-form-close')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});

    const sections=[...wrap.querySelectorAll('section.card.section')];
    const listSection=sections.find(s=>s!==source && s.querySelector('.item'));
    listSection?.classList.add('jobs-list-clean');
  }

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const overlay=document.querySelector('.jobs-form-sheet.open');
      if(overlay){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('jobs-sheet-open');}
    }
  });

  const observer=new MutationObserver(()=>mount());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
