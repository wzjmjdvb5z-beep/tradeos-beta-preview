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
  function dismissKeyboard(){
    const active=document.activeElement;
    if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))active.blur();
  }
  function bindMobileKeyboard(){
    if(window.__tradeosKeyboardBound)return;
    window.__tradeosKeyboardBound=true;
    document.addEventListener('submit',e=>{
      if(e.target.closest('.tos-br-quote-sheet'))dismissKeyboard();
    },true);
    document.addEventListener('click',e=>{
      if(e.target.closest('.tos-br-quote-sheet [data-save],.tos-br-quote-sheet [data-cancel],.tos-br-quote-sheet .tos-br-close,.bottom-nav [data-nav]')){
        dismissKeyboard();
        setTimeout(dismissKeyboard,40);
      }
    },true);
  }
  const sync=()=>{clearStaleJobNoteLayers();hardenAuthFields();bindMobileKeyboard();};
  window.addEventListener('pageshow',sync);
  document.addEventListener('DOMContentLoaded',sync,{once:true});
  new MutationObserver(hardenAuthFields).observe(document.documentElement,{childList:true,subtree:true});
})();
