(()=>{
  const URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const sb=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!sb)return;
  let queued=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;inject();});}
  function inject(){
    const list=document.querySelector('.modern-more-sheet .modern-more-list');
    if(!list||list.querySelector('[data-account-privacy]'))return;
    const signout=list.querySelector('[data-modern-signout]');
    const b=document.createElement('button');
    b.type='button';b.className='modern-more-item';b.dataset.accountPrivacy='1';
    b.innerHTML='<span class="modern-more-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6z"/><path d="M9.5 12.2 11 13.7l3.6-4"/></svg></span><span><strong>Account & privacy</strong><small>Account details, privacy, terms and deletion</small></span>';
    (signout||null)?.insertAdjacentElement('beforebegin',b);if(!signout)list.appendChild(b);
    b.addEventListener('click',()=>{document.querySelector('.modern-more-sheet')?.remove();openPanel();});
  }
  async function openPanel(){
    document.querySelector('.tos-account-overlay')?.remove();
    const overlay=document.createElement('div');overlay.className='tos-account-overlay';
    overlay.innerHTML='<section class="tos-account-panel" role="dialog" aria-modal="true" aria-label="Account and privacy"><div class="tos-account-head"><div><p class="eyebrow">ACCOUNT</p><h2>Account & privacy</h2><p>Manage your account and find the legal and support information for this service.</p></div><button type="button" class="tos-account-close" aria-label="Close">×</button></div><div class="tos-account-loading">Loading account…</div></section>';
    document.body.appendChild(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});overlay.querySelector('.tos-account-close')?.addEventListener('click',()=>overlay.remove());
    const panel=overlay.querySelector('.tos-account-panel');
    try{
      const {data:{user},error}=await sb.auth.getUser();if(error||!user)throw error||new Error('Please sign in again.');
      panel.querySelector('.tos-account-loading').outerHTML=`<div class="tos-account-card"><span class="tos-account-label">Signed in as</span><strong>${esc(user.email||'Signed-in user')}</strong></div><div class="tos-account-links"><a href="../privacy.html" target="_blank" rel="noopener">Privacy notice <span>›</span></a><a href="../terms.html" target="_blank" rel="noopener">Terms of service <span>›</span></a><a href="../support.html" target="_blank" rel="noopener">Support <span>›</span></a></div><div class="tos-account-danger"><h3>Delete account</h3><p>You can request deletion from inside the app. The request is queued for completion within 7 days, subject to legal retention and any workspace-owner steps that need resolving.</p><button type="button" class="tos-account-delete" data-delete-start>Request account deletion</button><div data-delete-confirm hidden><p class="tos-account-warning"><strong>This is a serious action.</strong> Your request will be recorded against this signed-in account. If you own a workspace, support may need to contact you about transfer or deletion of that workspace.</p><label>Type DELETE to confirm<input type="text" autocomplete="off" data-delete-word></label><div class="tos-account-actions"><button type="button" data-delete-cancel>Cancel</button><button type="button" class="danger" data-delete-confirm-btn disabled>Confirm deletion request</button></div></div><div class="tos-account-result" data-delete-result hidden></div></div>`;
      const start=panel.querySelector('[data-delete-start]'),confirm=panel.querySelector('[data-delete-confirm]'),word=panel.querySelector('[data-delete-word]'),go=panel.querySelector('[data-delete-confirm-btn]'),result=panel.querySelector('[data-delete-result]');
      start.addEventListener('click',()=>{start.hidden=true;confirm.hidden=false;word.focus();});
      panel.querySelector('[data-delete-cancel]').addEventListener('click',()=>{confirm.hidden=true;start.hidden=false;word.value='';go.disabled=true;});
      word.addEventListener('input',()=>{go.disabled=word.value.trim().toUpperCase()!=='DELETE';});
      go.addEventListener('click',async()=>{go.disabled=true;go.textContent='Submitting…';try{const r=await sb.rpc('request_account_deletion');if(r.error)throw r.error;const due=r.data?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(r.data)):null;confirm.hidden=true;result.hidden=false;result.innerHTML=`<strong>Deletion request received</strong><p>${due?`Target completion date: ${esc(due)}.`:'Your request has been queued.'} Contact support if you submitted this by mistake.</p>`;}catch(e){go.disabled=false;go.textContent='Confirm deletion request';result.hidden=false;result.textContent=e?.message||'Could not submit the deletion request.';}});
    }catch(e){panel.querySelector('.tos-account-loading').textContent=e?.message||'Could not load account details.';}
  }
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
