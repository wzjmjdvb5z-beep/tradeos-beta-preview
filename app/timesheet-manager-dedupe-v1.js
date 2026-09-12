(()=>{
  let scheduled=false;

  function dedupeManagerCards(){
    const cards=[...document.querySelectorAll('.tos-br-manager')];
    if(cards.length<=1)return;
    cards.slice(1).forEach(card=>card.remove());
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      dedupeManagerCards();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dedupeManagerCards,{once:true});
  else dedupeManagerCards();
})();
