(()=>{
  const URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const sb=window.veysteadSupabase||window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!sb)return;
  let queued=false,busy=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function employeeUrl(){
    const u=new window.URL(window.location.href);
    u.search='';u.hash='';u.searchParams.set('join','employee');
    return u.href;
  }
  async function context(){
    const {data:{user},error}=await sb.auth.getUser();if(error||!user)throw error||new Error('Please sign in again.');
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){const r=await sb.from('company_members').select('company_id,role').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();if(r.error)throw r.error;membership=r.data;}
    if(!membership){const r=await sb.from('company_members').select('company_id,role').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();if(r.error)throw r.error;membership=r.data;companyId=membership?.company_id||null;}
    if(!companyId||!membership)throw new Error('No active workspace found.');
    return{companyId,role:membership.role};
  }
  function isTeam(){return !!document.querySelector('.bottom-nav [data-nav="team"].active');}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}
  async function mount(){
    if(!isTeam())return;
    const wrap=document.querySelector('main.wrap'),form=document.querySelector('#inviteform');if(!wrap||!form)return;
    const submit=form.querySelector('button[type="submit"],button:not([type])');
    if(submit)submit.textContent='Add employee';
    const role=form.elements.role;if(role){role.value='employee';role.closest('.field')?.classList.add('tos-employee-role');}
    if(!form.querySelector('.tos-employee-form-note'))form.insertAdjacentHTML('afterbegin','<div class="tos-employee-form-note"><strong>Add their account email</strong><span>They must create their Veystead account using this exact email address.</span></div><div class="tos-employee-price"><span>EMPLOYEE PRICE</span><strong>£7.99/month for each additional active employee</strong><p>Your £19/month Veystead plan includes the owner. Subscriptions renew automatically each month until cancelled.</p><p class="tos-employee-legal">By adding an employee, you confirm you are authorised to add them and accept the <a href="../terms.html">Terms &amp; Conditions</a> and <a href="../privacy.html">Privacy Policy</a>.</p></div>');
    if(wrap.querySelector('[data-employee-onboarding]'))return;
    const card=document.createElement('section');card.className='tos-employee-onboarding';card.dataset.employeeOnboarding='1';
    card.innerHTML=`<p>Employees see assigned jobs, log their time and post updates. Only owners and admins manage membership. Financial information is restricted to owners, admins and managers.</p><div class="tos-employee-onboarding-head"><div><span>TEST EMPLOYEE VIEW</span><h3>Open Veystead on your employee’s phone</h3></div><button type="button" data-employee-share>Share app link</button></div><ol><li><b>1</b><span><strong>Add their email</strong><small>Tap “Invite a team member” above and keep the role as Employee.</small></span></li><li><b>2</b><span><strong>Create their account</strong><small>Open the shared link on their phone and use the exact invited email.</small></span></li><li><b>3</b><span><strong>Sign in as the employee</strong><small>The invitation joins them to your workspace automatically.</small></span></li></ol><div class="tos-employee-invite-status" data-employee-status>Checking invitations…</div></section>`;
    const trigger=wrap.querySelector('.tos-clean-invite'),grid=wrap.querySelector('.team-grid');(trigger||grid||wrap.firstElementChild)?.insertAdjacentElement('afterend',card);
    card.querySelector('[data-employee-share]').addEventListener('click',()=>shareInvite());
    loadPending(card.querySelector('[data-employee-status]'));
  }
  async function loadPending(box){
    try{const c=await context();const r=await sb.from('company_invitations').select('email,role,status,expires_at,created_at').eq('company_id',c.companyId).order('created_at',{ascending:false}).limit(10);if(r.error)throw r.error;const pending=(r.data||[]).find(x=>x.status==='pending');box.classList.toggle('pending',!!pending);box.innerHTML=pending?`<span>Pending employee invite</span><strong>${esc(pending.email)}</strong><button type="button" data-share-pending>Share instructions</button>`:'<span>No employee waiting to join</span><strong>Add your employee’s email to begin.</strong>';box.querySelector('[data-share-pending]')?.addEventListener('click',()=>shareInvite(pending.email));}
    catch{box.innerHTML='<span>Invitation status unavailable</span><strong>You can still add an employee above.</strong>';}
  }
  async function invite(form){
    if(busy)return;const email=String(form.elements.email?.value||'').trim().toLowerCase(),role=String(form.elements.role?.value||'employee');
    const button=form.querySelector('button[type="submit"],button:not([type])');
    if(!email||!email.includes('@')){showToast('Enter your employee’s email address.',true);return;}
    busy=true;const old=button?.textContent;if(button){button.disabled=true;button.textContent='Adding…';}
    try{const c=await context();const r=await sb.rpc('create_company_invitation',{target_company:c.companyId,target_email:email,target_role:role});if(r.error)throw r.error;document.querySelector('.tos-clean-sheet')?._cleanClose?.();showSuccess(email);}
    catch(err){showToast(err?.message||'Could not add this employee.',true);}
    finally{busy=false;if(button?.isConnected){button.disabled=false;button.textContent=old||'Add employee';}}
  }
  function showSuccess(email){
    document.querySelector('.tos-employee-success')?.remove();const o=document.createElement('div');o.className='tos-employee-success';
    o.innerHTML=`<div class="tos-employee-success-panel"><div class="tos-employee-success-tick">✓</div><h3>Employee added</h3><p><strong>${esc(email)}</strong> can now join your workspace.</p><div class="tos-employee-next"><b>On your employee’s phone:</b><span>1. Open the Veystead link</span><span>2. Tap Create account</span><span>3. Use ${esc(email)}</span><span>4. Confirm the email, then sign in</span></div><button type="button" class="primary" data-success-share>Share link and instructions</button><button type="button" data-success-close>Done</button></div>`;
    document.body.appendChild(o);o.querySelector('[data-success-share]').addEventListener('click',()=>shareInvite(email));o.querySelector('[data-success-close]').addEventListener('click',()=>{o.remove();schedule();});o.addEventListener('click',e=>{if(e.target===o){o.remove();schedule();}});
  }
  async function shareInvite(email=''){
    const url=employeeUrl(),text=`Open Veystead, tap Create account and use ${email||'the email address I invited'}. Confirm the email, then sign in to see the employee view.`;
    try{if(window.tradeOSNative?.share){await window.tradeOSNative.share({title:'Join my Veystead team',text,url});return;}if(navigator.share){await navigator.share({title:'Join my Veystead team',text,url});return;}await navigator.clipboard.writeText(`${text}\n${url}`);showToast('Employee instructions copied');}
    catch(err){if(err?.name!=='AbortError')showToast('Could not share the link.',true);}
  }
  function customiseJoinScreen(){
    if(new URLSearchParams(location.search).get('join')!=='employee')return;const auth=document.querySelector('.auth-card #auth');if(!auth||auth.dataset.employeeJoin==='1')return;auth.dataset.employeeJoin='1';const h=auth.parentElement.querySelector('h2'),p=auth.parentElement.querySelector('.sub');if(h)h.textContent='Join your Veystead team';if(p)p.textContent='Create your employee account using the exact email address your employer invited.';const signup=auth.querySelector('#signup');if(signup){signup.textContent='Create employee account';signup.classList.remove('secondary');}const signIn=auth.querySelector('button:not([type])');if(signIn)signIn.textContent='Already registered? Sign in';
  }
  function showToast(message,bad=false){document.querySelector('.tos-employee-toast')?.remove();const x=document.createElement('div');x.className=`tos-employee-toast${bad?' bad':''}`;x.textContent=message;document.body.appendChild(x);setTimeout(()=>x.remove(),2800);}
  document.addEventListener('submit',e=>{const form=e.target.closest?.('#inviteform');if(!form)return;e.preventDefault();e.stopImmediatePropagation();invite(form);},true);
  new MutationObserver(()=>{schedule();customiseJoinScreen();}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{schedule();customiseJoinScreen();},{once:true});else{schedule();customiseJoinScreen();}
})();
