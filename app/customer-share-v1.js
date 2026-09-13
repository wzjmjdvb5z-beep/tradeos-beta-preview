(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co',KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf',PUBLIC_WEB_BASE='https://tradeos-beta-xvt4.netlify.app',client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;
  let selected=null,queued=false;
  document.addEventListener('click',e=>{const q=e.target.closest?.('[data-com-quote]'),i=e.target.closest?.('[data-com-invoice]');if(q)selected={type:'quote',id:q.dataset.comQuote};if(i)selected={type:'invoice',id:i.dataset.comInvoice};},true);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}
  function mount(){
    const sheet=document.querySelector('.tos-com-sheet');if(!sheet||sheet.dataset.shareMounted==='1'||!selected)return;
    const kicker=(sheet.querySelector('.eyebrow')?.textContent||'').trim().toUpperCase();if((selected.type==='quote'&&kicker!=='QUOTE')||(selected.type==='invoice'&&kicker!=='INVOICE'))return;
    sheet.dataset.shareMounted='1';const body=sheet.querySelector('.tos-com-sheet-body');if(!body)return;
    const box=document.createElement('div');box.className='tos-share-box';box.innerHTML=`<strong>${selected.type==='quote'?'Send to customer':'Share invoice'}</strong><p>${selected.type==='quote'?'Create a secure link the customer can open, review and accept or decline.':'Create a secure customer link with the live balance and a print/PDF option.'}</p><div class="tos-share-status checking" data-share-delivery>Checking customer activity…</div><button type="button" class="tos-share-btn">${selected.type==='quote'?'Create customer link':'Create invoice link'}</button>`;
    body.appendChild(box);box.querySelector('button').addEventListener('click',e=>makeLink(selected.type,selected.id,e.currentTarget));loadDelivery(selected.type,selected.id,box.querySelector('[data-share-delivery]'));
  }
  async function companyId(){
    const direct=document.querySelector('#company')?.value;if(direct)return direct;
    const {data:{user}}=await client.auth.getUser();if(!user)return null;
    const r=await client.from('company_members').select('company_id').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();return r.data?.company_id||null;
  }
  async function loadDelivery(type,id,el){
    if(!el)return;try{const cid=await companyId();if(!cid)throw new Error('');const r=await client.rpc('get_document_delivery_status',{target_company:cid});if(r.error)throw r.error;const row=(r.data||[]).find(x=>x.document_type===type&&(type==='quote'?x.quote_id:x.invoice_id)===id);el.classList.remove('checking','viewed','sent');if(!row){el.textContent='Not sent to customer yet';return;}if(row.last_viewed_at){el.classList.add('viewed');el.textContent=`Viewed by customer · ${when(row.last_viewed_at)}`;}else{el.classList.add('sent');el.textContent=`Sent · not viewed yet${row.sent_at?` · ${when(row.sent_at)}`:''}`;}}catch{el.classList.remove('checking');el.textContent='Customer activity unavailable';}
  }
  function customerDocumentUrl(type,token){
    const path=type==='quote'?'quote/':'invoice/';
    const isWeb=/^https?:$/.test(window.location.protocol);
    const base=isWeb?new window.URL(`../${path}`,window.location.href):new window.URL(`/${path}`,PUBLIC_WEB_BASE);
    base.searchParams.set('t',token);
    return base.href;
  }
  async function makeLink(type,id,button){
    if(button.disabled)return;const old=button.textContent;button.disabled=true;button.textContent='Creating link…';
    try{const r=await client.rpc('create_document_share_token',{target_type:type,target_id:id,expires_days:90});if(r.error)throw r.error;const token=r.data;const url=customerDocumentUrl(type,token);openShare(type,url);updateStatus(type,id);const el=document.querySelector('.tos-com-sheet [data-share-delivery]');if(el){el.className='tos-share-status sent';el.textContent='Sent · not viewed yet';}}
    catch(err){button.disabled=false;button.textContent=old;showToast(err?.message||'Could not create customer link',true);}
  }
  async function preview(url){
    try{
      if(window.tradeOSNative?.openExternal){await window.tradeOSNative.openExternal(url);return;}
      const opened=window.open(url,'_blank','noopener,noreferrer');
      if(opened)return;
      window.location.assign(url);
    }catch(err){showToast(err?.message||'Could not open preview',true);}
  }
  function openShare(type,url){
    document.querySelector('.tos-share-overlay')?.remove();const o=document.createElement('div');o.className='tos-share-overlay';o.innerHTML=`<div class="tos-share-panel"><div class="tos-share-handle"></div><div class="tos-share-head"><div><h3>${type==='quote'?'Customer quote link':'Customer invoice link'}</h3><p>${type==='quote'?'The customer can review and respond without signing in.':'The customer sees the invoice, current balance and print/PDF option.'}</p></div><button class="tos-share-close" type="button">×</button></div><div class="tos-share-link">${esc(url)}</div><div class="tos-share-actions"><button type="button" data-share-copy>Copy link</button><button type="button" class="primary" data-share-native>Share</button><button type="button" data-share-preview>Open preview</button></div><p class="tos-share-note">Links expire after 90 days. Anyone with the link can view the document.</p></div>`;document.body.appendChild(o);
    const close=()=>o.remove();o.querySelector('.tos-share-close').addEventListener('click',close);o.addEventListener('click',e=>{if(e.target===o)close();});o.querySelector('[data-share-copy]').addEventListener('click',async e=>{try{await navigator.clipboard.writeText(url);e.currentTarget.textContent='Copied';}catch{fallbackCopy(url);e.currentTarget.textContent='Copied';}});o.querySelector('[data-share-native]').addEventListener('click',async()=>{try{if(window.tradeOSNative?.share){await window.tradeOSNative.share({title:type==='quote'?'TradeOS quote':'TradeOS invoice',text:type==='quote'?'Here is your quote.':'Here is your invoice.',url});}else if(navigator.share){await navigator.share({title:type==='quote'?'TradeOS quote':'TradeOS invoice',text:type==='quote'?'Here is your quote.':'Here is your invoice.',url});}else{fallbackCopy(url);showToast('Link copied');}}catch{}});o.querySelector('[data-share-preview]').addEventListener('click',()=>preview(url));
  }
  function fallbackCopy(text){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
  function updateStatus(type,id){const card=document.querySelector(type==='quote'?`[data-com-quote="${css(id)}"]`:`[data-com-invoice="${css(id)}"]`);[card,document.querySelector('.tos-com-sheet')].forEach(root=>{const chip=root?.querySelector('.tos-com-status.draft');if(chip){chip.className='tos-com-status sent';chip.textContent='Sent';}});}
  function when(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);}
  function showToast(message,error=false){document.querySelector('.tos-com-toast')?.remove();const t=document.createElement('div');t.className=`tos-com-toast${error?' error':''}`;t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2800);}
  function css(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  window.addEventListener('focus',()=>{const sheet=document.querySelector('.tos-com-sheet'),el=sheet?.querySelector('[data-share-delivery]');if(sheet&&el&&selected)loadDelivery(selected.type,selected.id,el);if(document.querySelector('.tos-share-overlay'))return;const wrap=document.querySelector('main.wrap');if(!wrap||!['quotes','finance'].includes(wrap.dataset.commercialView||''))return;delete wrap.dataset.commercialView;wrap.classList.toggle('tos-share-refresh');});
  schedule();
})();
