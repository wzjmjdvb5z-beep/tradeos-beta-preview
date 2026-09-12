(()=>{
  const URL='https://nynssdxfmjfqgodgynnu.supabase.co',KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});if(!client)return;
  let selected=null,queued=false;
  document.addEventListener('click',e=>{const q=e.target.closest?.('[data-com-quote]'),i=e.target.closest?.('[data-com-invoice]');if(q)selected={type:'quote',id:q.dataset.comQuote};if(i)selected={type:'invoice',id:i.dataset.comInvoice};},true);
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount().catch(()=>{});});}
  async function companyId(){const direct=document.querySelector('#company')?.value;if(direct)return direct;const {data:{user}}=await client.auth.getUser();if(!user)return null;const r=await client.from('company_members').select('company_id').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();if(r.error)throw r.error;return r.data?.company_id||null;}
  async function mount(){
    const sheet=document.querySelector('.tos-com-sheet');const box=sheet?.querySelector('.tos-share-box');if(!sheet||!box||!selected||box.querySelector('[data-revoke-share]'))return;
    const cid=await companyId();if(!cid)return;const r=await client.rpc('get_document_delivery_status',{target_company:cid});if(r.error)throw r.error;
    const row=(r.data||[]).find(x=>x.document_type===selected.type&&(selected.type==='quote'?x.quote_id:x.invoice_id)===selected.id);if(!row)return;
    const btn=document.createElement('button');btn.type='button';btn.className='tos-share-revoke';btn.dataset.revokeShare='1';btn.textContent='Revoke customer link';box.appendChild(btn);
    btn.addEventListener('click',async()=>{
      if(btn.dataset.confirm!=='1'){btn.dataset.confirm='1';btn.textContent='Tap again to revoke link';setTimeout(()=>{if(btn.isConnected&&btn.dataset.confirm==='1'){btn.dataset.confirm='';btn.textContent='Revoke customer link';}},3500);return;}
      btn.disabled=true;btn.textContent='Revoking…';
      try{const rr=await client.rpc('revoke_document_share_token',{target_type:selected.type,target_id:selected.id});if(rr.error)throw rr.error;btn.remove();const status=box.querySelector('[data-share-delivery]');if(status){status.className='tos-share-status';status.textContent='Customer link revoked';}showToast('Customer link revoked');}
      catch(e){btn.disabled=false;btn.dataset.confirm='';btn.textContent='Revoke customer link';showToast(e?.message||'Could not revoke link',true);}
    });
  }
  function showToast(message,error=false){document.querySelector('.tos-com-toast')?.remove();const t=document.createElement('div');t.className=`tos-com-toast${error?' error':''}`;t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2800);}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('focus',schedule);schedule();
})();
