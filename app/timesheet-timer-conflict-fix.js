(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let handling=false;
  const conflictText=/overlaps an existing entry|timesheet entry covering this start time/i;

  async function stopInvalidRunningTimer(errorNode){
    if(handling)return;
    const text=errorNode?.textContent||'';
    if(!conflictText.test(text))return;
    handling=true;
    const sheet=errorNode.closest('.tos-timer-sheet');
    const panel=sheet?.querySelector('.tos-timer-panel');
    try{
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError)throw userError;
      if(user){
        const {data:timer,error:timerError}=await client.from('job_timer_sessions')
          .select('id')
          .eq('user_id',user.id)
          .eq('status','running')
          .order('started_at',{ascending:false})
          .limit(1)
          .maybeSingle();
        if(timerError)throw timerError;
        if(timer?.id){
          const {error}=await client.rpc('cancel_job_timer',{target_timer:timer.id});
          if(error)throw error;
        }
      }
      if(panel){
        panel.innerHTML='<div class="tos-timer-handle"></div><h3>Timer stopped</h3><p class="sub">This timer overlapped time that was already on your timesheet, so no duplicate time was saved.</p><div class="tos-timer-error soft"><strong>Conflict prevented</strong><span>Veystead has stopped the invalid timer. Refreshing your timesheet…</span></div>';
      }
      setTimeout(()=>location.reload(),1600);
    }catch(err){
      handling=false;
      const message=sheet?.querySelector('#tos-stop-message');
      if(message)message.innerHTML='<div class="tos-timer-error"><strong>Couldn’t stop the conflicting timer</strong><span>Please cancel the timer manually, then try again.</span></div>';
    }
  }

  function scan(){
    document.querySelectorAll('.tos-timer-error').forEach(node=>{
      if(conflictText.test(node.textContent||''))stopInvalidRunningTimer(node);
    });
  }

  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
})();
