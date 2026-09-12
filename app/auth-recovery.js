(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  if(!window.supabase)return;
  const authClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const root=document.getElementById('root');

  function cleanUrl(){return location.origin+location.pathname;}
  function message(text,bad=false){
    let box=document.getElementById('recovery-message');
    if(!box){box=document.createElement('div');box.id='recovery-message';const form=document.getElementById('auth');form?.insertAdjacentElement('afterend',box);}
    box.className=bad?'error':'success';box.textContent=String(text||'');
  }
  function recoveryStatus(text,bad=true){
    const status=document.getElementById('recovery-status');
    if(!status)return;
    status.replaceChildren();
    const box=document.createElement('div');
    box.className=bad?'error':'success';
    box.textContent=String(text||'');
    status.appendChild(box);
  }
  function enhanceAuth(){
    const form=document.getElementById('auth');
    if(!form||document.getElementById('forgot-password'))return;
    const btn=document.createElement('button');
    btn.type='button';btn.id='forgot-password';btn.className='btn secondary';btn.style.width='100%';btn.style.marginTop='10px';btn.textContent='Forgot password';
    form.appendChild(btn);
    btn.addEventListener('click',async()=>{
      const email=String(form.querySelector('input[name="email"]')?.value||'').trim().toLowerCase();
      if(!email||!email.includes('@')){message('Enter your email address first.',true);return;}
      btn.disabled=true;btn.textContent='Sending reset link…';
      try{
        const {error}=await authClient.auth.resetPasswordForEmail(email,{redirectTo:cleanUrl()});
        if(error)throw error;
        message('Password reset email sent. Open the link in that email on this phone.');
      }catch(err){message(err?.message||'Could not send password reset email.',true);}
      finally{btn.disabled=false;btn.textContent='Forgot password';}
    });
  }
  function showRecovery(){
    root.innerHTML=`<div class="auth-shell"><section class="card auth-card"><p class="eyebrow">TRADEOS ACCOUNT</p><h2>Choose a new password</h2><p class="sub">Use at least 8 characters.</p><form id="password-recovery"><div class="field"><label>New password</label><input name="password" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label>Confirm password</label><input name="confirm" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn" type="submit">Save new password</button></form><div id="recovery-status" aria-live="polite"></div></section></div>`;
    document.getElementById('password-recovery').addEventListener('submit',async e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget);const password=String(f.get('password')||''),confirm=String(f.get('confirm')||'');
      if(password.length<8){recoveryStatus('Password must be at least 8 characters.');return;}
      if(password!==confirm){recoveryStatus('Passwords do not match.');return;}
      const button=e.currentTarget.querySelector('button');button.disabled=true;button.textContent='Saving…';
      const {error}=await authClient.auth.updateUser({password});
      if(error){recoveryStatus(error.message||'Could not update password.');button.disabled=false;button.textContent='Save new password';return;}
      await authClient.auth.signOut();
      history.replaceState({},'',cleanUrl());
      location.reload();
    });
  }

  authClient.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')showRecovery();});
  const observer=new MutationObserver(enhanceAuth);observer.observe(root,{childList:true,subtree:true});
  enhanceAuth();
})();
