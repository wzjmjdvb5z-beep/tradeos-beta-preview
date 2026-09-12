(()=>{
  function clearStaleJobNoteLayers(){
    document.querySelectorAll('.tos-job-note-sheet,.tos-job-note-confirm,.tos-job-photo-viewer').forEach(el=>el.remove());
    document.body.classList.remove('tos-job-note-open','tos-job-photo-viewer-open');
  }
  function hardenAuthFields(){
    const email=document.querySelector('input[name="email"]');
    const password=document.querySelector('input[name="password"]');
    if(email){email.setAttribute('autocomplete','email');email.setAttribute('autocapitalize','none');email.setAttribute('spellcheck','false');}
    if(password){password.setAttribute('autocomplete','current-password');}
  }
  const sync=()=>{clearStaleJobNoteLayers();hardenAuthFields();};
  window.addEventListener('pageshow',sync);
  document.addEventListener('DOMContentLoaded',sync,{once:true});
  new MutationObserver(hardenAuthFields).observe(document.documentElement,{childList:true,subtree:true});
})();
