(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false;
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a2.2 2.2 0 1 1 0 4.4A2.2 2.2 0 0 1 12 6Zm0 8.4c-1.8 0-3.4.7-4.5 1.8A5.4 5.4 0 0 0 12 18a5.4 5.4 0 0 0 4.5-1.8A6.2 6.2 0 0 0 12 14.4Z"/></svg>';

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  async function mount(){
    const list=document.querySelector('.modern-more-list');
    if(!list||list.querySelector('[data-tradeos-account-privacy]')||list.dataset.accountPrivacyMounting==='1')return;
    list.dataset.accountPrivacyMounting='1';
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user||!list.isConnected)return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='modern-more-item';
      btn.dataset.tradeosAccountPrivacy='1';
      btn.innerHTML=`<span class="modern-more-icon">${icon}</span><span><strong>Account &amp; privacy</strong><small>Privacy policy · delete account</small></span>`;
      btn.addEventListener('click',()=>{
        document.querySelector('.modern-more-sheet')?.remove();
        openSheet();
      });
      const signout=list.querySelector('[data-modern-signout]');
      list.insertBefore(btn,signout||null);
    }finally{
      delete list.dataset.accountPrivacyMounting;
    }
  }

  function closeSheet(){
    document.querySelector('.tos-account-privacy-sheet')?.remove();
    document.body.classList.remove('tos-account-privacy-open');
  }

  function openSheet(){
    closeSheet();
    const styleId='tos-account-privacy-style';
    if(!document.getElementById(styleId)){
      const style=document.createElement('style');
      style.id=styleId;
      style.textContent=`
        .tos-account-privacy-sheet{position:fixed;inset:0;z-index:12050;background:rgba(4,12,24,.5);display:flex;align-items:flex-end;justify-content:center;padding-top:24px}
        .tos-account-privacy-panel{width:min(640px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:12px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(8,20,40,.18);color:#142033}
        .tos-account-privacy-handle{width:42px;height:5px;border-radius:99px;background:#d7dee8;margin:2px auto 18px}
        .tos-account-privacy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.tos-account-privacy-head h3{margin:0;font-size:22px}.tos-account-privacy-head p{margin:5px 0 0;color:#66758b;font-size:14px}
        .tos-account-privacy-close{border:0;background:#eef2f7;width:36px;height:36px;border-radius:50%;font-size:24px;line-height:1;color:#425069}
        .tos-account-privacy-card{border:1px solid #dfe6ef;border-radius:16px;padding:16px;margin:12px 0;background:#fff}.tos-account-privacy-card h4{margin:0 0 6px;font-size:16px}.tos-account-privacy-card p{margin:0;color:#66758b;font-size:14px;line-height:1.45}
        .tos-account-privacy-link,.tos-account-delete-start,.tos-account-delete-confirm{display:flex;width:100%;align-items:center;justify-content:center;border-radius:13px;padding:13px 15px;margin-top:12px;font-weight:800;font-size:15px;text-decoration:none;box-sizing:border-box}
        .tos-account-privacy-link{background:#eef4ff;color:#1456d9;border:1px solid #d9e6ff}.tos-account-delete-start{background:#fff5f5;color:#b42318;border:1px solid #fecaca}.tos-account-delete-confirm{background:#b42318;color:#fff;border:1px solid #b42318}
        .tos-account-delete-confirm:disabled{opacity:.55}.tos-account-delete-note{font-size:12.5px!important;margin-top:10px!important}.tos-account-delete-result{border-radius:13px;padding:13px;margin-top:12px;font-size:14px;line-height:1.45}.tos-account-delete-result.ok{background:#eefbf3;color:#176b3a}.tos-account-delete-result.err{background:#fff1f1;color:#a11b1b}
        body.tos-account-privacy-open{overflow:hidden}
      `;
      document.head.appendChild(style);
    }

    const overlay=document.createElement('div');
    overlay.className='tos-account-privacy-sheet';
    overlay.innerHTML=`<section class="tos-account-privacy-panel" role="dialog" aria-modal="true" aria-label="Account and privacy">
      <div class="tos-account-privacy-handle"></div>
      <div class="tos-account-privacy-head"><div><h3>Account &amp; privacy</h3><p>Privacy information and account controls.</p></div><button type="button" class="tos-account-privacy-close" aria-label="Close">×</button></div>
      <div class="tos-account-privacy-card">
        <h4>Privacy policy</h4><p>See what information Veystead processes, why it is used and how to make a privacy request.</p>
        <a class="tos-account-privacy-link" href="../privacy.html">Read privacy policy</a><p class="tos-privacy-error" role="alert" hidden></p>
      </div>
      <div class="tos-account-privacy-card tos-account-delete-card">
        <h4>Delete account</h4><p>Request deletion of your Veystead user account and associated personal data. Requests are scheduled for completion within seven days, subject to records that must lawfully be retained and any business-workspace ownership that must be resolved.</p>
        <button type="button" class="tos-account-delete-start">Request account deletion</button>
        <p class="tos-account-delete-note">If your business has a web subscription, account deletion does not itself create a new purchase or charge. Any subscription or workspace ownership that needs attention will be handled as part of the deletion process.</p>
        <div class="tos-account-delete-result" hidden></div>
      </div>
    </section>`;
    document.body.appendChild(overlay);
    document.body.classList.add('tos-account-privacy-open');

    overlay.querySelector('.tos-account-privacy-link')?.addEventListener('click',async e=>{
      if(!window.tradeOSNative?.isNative)return;
      e.preventDefault();
      const error=overlay.querySelector('.tos-privacy-error');
      error.hidden=true;
      try{await window.tradeOSNative.openExternal('https://veystead.com/privacy.html');}
      catch(_){error.textContent='Could not open the privacy policy. Please try again.';error.hidden=false;}
    });
    overlay.querySelector('.tos-account-privacy-close')?.addEventListener('click',closeSheet);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeSheet();});
    overlay.querySelector('.tos-account-delete-start')?.addEventListener('click',()=>confirmDeletion(overlay));
  }

  function confirmDeletion(overlay){
    const card=overlay.querySelector('.tos-account-delete-card');
    if(!card||card.querySelector('.tos-account-delete-confirm'))return;
    const start=card.querySelector('.tos-account-delete-start');
    if(start)start.hidden=true;
    const warning=document.createElement('div');
    warning.className='tos-account-delete-result err';
    warning.innerHTML='<strong>Are you sure?</strong><br>This requests deletion of your entire user account, not just sign-out. You can continue only if you want the account and associated personal data deleted.';
    const confirm=document.createElement('button');
    confirm.type='button';
    confirm.className='tos-account-delete-confirm';
    confirm.textContent='Yes, delete my account';
    card.appendChild(warning);
    card.appendChild(confirm);
    confirm.addEventListener('click',()=>requestDeletion(overlay,confirm));
  }

  async function requestDeletion(overlay,button){
    button.disabled=true;
    button.textContent='Requesting deletion…';
    const result=overlay.querySelector('.tos-account-delete-result[hidden]');
    try{
      const {data,error}=await client.rpc('request_account_deletion');
      if(error)throw error;
      const when=data?new Date(data):null;
      const due=when&&!Number.isNaN(when.getTime())?when.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'within seven days';
      if(result){
        result.hidden=false;
        result.className='tos-account-delete-result ok';
        result.innerHTML=`<strong>Deletion requested.</strong><br>Your request is scheduled for completion by ${due}. You will receive confirmation when it has been completed.`;
      }
      button.remove();
    }catch(error){
      if(result){
        result.hidden=false;
        result.className='tos-account-delete-result err';
        result.textContent=error?.message||'Could not request account deletion. Please try again.';
      }
      button.disabled=false;
      button.textContent='Yes, delete my account';
    }
  }

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
