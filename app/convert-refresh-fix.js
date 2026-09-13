(()=>{
  if(window.__tradeosConvertRefreshFix)return;
  window.__tradeosConvertRefreshFix=true;
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!sb)return;
  let lastQuoteId=null;

  function toast(message,error=false){
    document.querySelector('.tos-convert-fix-toast')?.remove();
    const t=document.createElement('div');
    t.className='tos-convert-fix-toast';
    t.textContent=message;
    Object.assign(t.style,{position:'fixed',left:'50%',bottom:'150px',transform:'translateX(-50%)',zIndex:'3000',background:error?'#991b1b':'#0f172a',color:'#fff',padding:'11px 14px',borderRadius:'12px',fontWeight:'800',maxWidth:'calc(100vw - 32px)',textAlign:'center',boxShadow:'0 10px 30px rgba(15,23,42,.25)'});
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2600);
  }

  async function convert(id,button){
    if(!id||button?.dataset?.convertBusy==='1')return;
    const old=button?.textContent||'Turn into job';
    if(button){button.dataset.convertBusy='1';button.disabled=true;button.textContent='Creating job…';}
    try{
      const r=await sb.rpc('convert_trade_quote_to_job',{target_quote:id});
      if(r.error)throw r.error;
      sessionStorage.setItem('tradeos.afterReloadNav','jobs');
      toast('Job created');
      setTimeout(()=>window.location.reload(),120);
    }catch(e){
      if(button){button.disabled=false;button.textContent=old;delete button.dataset.convertBusy;}
      toast(e?.message||'Could not create job',true);
    }
  }

  document.addEventListener('click',e=>{
    const quote=e.target.closest?.('[data-com-quote]');
    if(quote?.dataset?.comQuote)lastQuoteId=quote.dataset.comQuote;

    const button=e.target.closest?.('[data-com-convert],[data-sheet-convert]');
    if(!button)return;
    const id=button.dataset.comConvert||lastQuoteId;
    if(!id)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    convert(id,button);
  },true);

  function restoreNav(){
    const target=sessionStorage.getItem('tradeos.afterReloadNav');
    if(!target)return true;
    const btn=document.querySelector(`.bottom-nav [data-nav="${target}"]`);
    if(!btn)return false;
    sessionStorage.removeItem('tradeos.afterReloadNav');
    setTimeout(()=>btn.click(),80);
    return true;
  }
  if(!restoreNav()){
    const obs=new MutationObserver(()=>{if(restoreNav())obs.disconnect();});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>obs.disconnect(),8000);
  }
})();