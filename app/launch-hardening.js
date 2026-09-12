(()=>{
  function clearStaleJobNoteLayers(){
    document.querySelectorAll('.tos-job-note-sheet,.tos-job-note-confirm,.tos-job-photo-viewer').forEach(el=>el.remove());
    document.body.classList.remove('tos-job-note-open','tos-job-photo-viewer-open');
  }
  window.addEventListener('pageshow',clearStaleJobNoteLayers);
  document.addEventListener('DOMContentLoaded',clearStaleJobNoteLayers,{once:true});
})();
