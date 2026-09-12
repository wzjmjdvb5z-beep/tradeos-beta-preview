(()=>{
  const URL='https://nynssdxfmjfqgodgynnu.supabase.co',KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const sb=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});if(!sb)return;
  const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  let timer=null,lastSheet=null;
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function toast(m){document.querySelector('.tos-br-toast')?.remove();const x=document.createElement('div');x.className='tos-br-toast';x.textContent=m;document.body.appendChild(x);setTimeout(()=>x.remove(),2200);}
  async function context(){
    const {data:{user},error}=await sb.auth.getUser();if(error||!user)throw error||new Error('Please sign in again.');
    let companyId=document.querySelector('#company')?.value||null,r=null;
    if(companyId){r=await sb.from('company_members').select('company_id,role').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();if(r.error)throw r.error;if(r.data)return{companyId,role:r.data.role};}
    r=await sb.from('company_members').select('company_id,role').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();if(r.error||!r.data)throw r.error||new Error('No active workspace found.');
    return{companyId:r.data.company_id,role:r.data.role};
  }
  async function load(companyId){const r=await sb.from('price_book_items').select('id,name,description,unit_price,vat_rate,unit,category,active').eq('company_id',companyId).eq('active',true).order('name',{ascending:true});if(r.error)throw r.error;return r.data||[];}
  function findSheet(){return document.querySelector('.tos-br-quote-sheet');}
  function startWatcher(){if(timer)return;timer=setInterval(()=>{const s=findSheet();if(s&&s!==lastSheet){lastSheet=s;mount(s);}if(!s)lastSheet=null;},200);}
  async function mount(sheet){
    if(sheet.dataset.priceBookV2==='1')return;sheet.dataset.priceBookV2='1';
    const host=sheet.querySelector('[data-items]');if(!host){sheet.dataset.priceBookV2='';return;}
    const box=document.createElement('div');box.className='tos-pb-box tos-pb-loading';box.innerHTML='<div class="tos-pb-head"><strong>Saved items / price book</strong></div><p class="tos-pb-empty">Loading saved prices…</p>';
    host.insertAdjacentElement('beforebegin',box);
    try{const c=await context();let items=await load(c.companyId);render(box,c,host,items,async()=>{items=await load(c.companyId);render(box,c,host,items,arguments.callee);});}
    catch(e){box.classList.remove('tos-pb-loading');box.innerHTML=`<div class="tos-pb-head"><strong>Saved items / price book</strong></div><p class="tos-pb-error">Could not load saved prices: ${esc(e?.message||'Unknown error')}</p><button type="button" class="tos-pb-manage" data-pb-retry>Retry</button>`;box.querySelector('[data-pb-retry]')?.addEventListener('click',()=>{sheet.dataset.priceBookV2='';box.remove();mount(sheet);});}
  }
  function render(box,c,host,items,onChanged){
    box.classList.remove('tos-pb-loading');
    box.innerHTML=`<div class="tos-pb-head"><strong>Saved items / price book</strong><button type="button" class="tos-pb-manage">Manage</button></div><input class="tos-pb-search" type="search" placeholder="Search saved prices…"><div class="tos-pb-items"></div><p class="tos-pb-empty" hidden>No saved items match.</p>`;
    const list=box.querySelector('.tos-pb-items'),search=box.querySelector('.tos-pb-search'),empty=box.querySelector('.tos-pb-empty');
    const draw=()=>{const q=search.value.trim().toLowerCase(),shown=items.filter(i=>!q||`${i.name} ${i.description||''} ${i.category||''}`.toLowerCase().includes(q));list.innerHTML=shown.map(i=>`<button type="button" class="tos-pb-item" data-pb-id="${esc(i.id)}"><strong>${esc(i.name)}</strong><span>${money.format(Number(i.unit_price||0))}${i.unit&&i.unit!=='each'?` / ${esc(i.unit)}`:''}</span></button>`).join('');empty.hidden=!!shown.length;list.querySelectorAll('[data-pb-id]').forEach(b=>b.addEventListener('click',()=>{const item=items.find(i=>i.id===b.dataset.pbId);if(item)addToQuote(host,item);}));};
    search.addEventListener('input',draw);box.querySelector('.tos-pb-manage').addEventListener('click',()=>openManager(c,async()=>{items=await load(c.companyId);draw();await onChanged?.();}));draw();
  }
  function addToQuote(host,item){
    const form=host.closest('form');if(!form){toast('Could not find quote form');return;}
    let rows=[...host.querySelectorAll('.tos-br-q-item')];let row=rows.find(r=>!r.querySelector('[data-item-desc]')?.value.trim()&&Number(r.querySelector('[data-item-price]')?.value||0)===0);
    if(!row){form.querySelector('[data-add-item]')?.click();rows=[...host.querySelectorAll('.tos-br-q-item')];row=rows.at(-1);}if(!row){toast('Could not add item');return;}
    const desc=row.querySelector('[data-item-desc]'),qty=row.querySelector('[data-item-qty]'),price=row.querySelector('[data-item-price]'),vat=row.querySelector('[data-item-vat]'),optional=row.querySelector('[data-item-optional]');
    desc.value=item.name||item.description||'Saved item';qty.value='1';price.value=Number(item.unit_price||0).toFixed(2).replace(/\.00$/,'');vat.value=String(Number(item.vat_rate||0));optional.checked=false;
    desc.dispatchEvent(new Event('input',{bubbles:true}));price.dispatchEvent(new Event('input',{bubbles:true}));vat.dispatchEvent(new Event('change',{bubbles:true}));
    row.scrollIntoView({behavior:'smooth',block:'center'});toast(`${item.name} added at ${money.format(Number(item.unit_price||0))}`);
  }
  async function openManager(c,onChanged){
    document.querySelector('.tos-pb-overlay')?.remove();const overlay=document.createElement('div');overlay.className='tos-pb-overlay';overlay.innerHTML=`<section class="tos-pb-panel" role="dialog" aria-modal="true"><div class="tos-pb-top"><div><h2>Price book</h2><p class="tos-pb-sub">Save regular prices once, then tap them into quotes.</p></div><button class="tos-pb-close" type="button">×</button></div><div class="tos-pb-list">Loading…</div><button class="tos-pb-add" type="button">+ Add saved item</button><div data-pb-editor></div></section>`;document.body.appendChild(overlay);
    overlay.querySelector('.tos-pb-close').addEventListener('click',()=>overlay.remove());overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    const list=overlay.querySelector('.tos-pb-list'),editor=overlay.querySelector('[data-pb-editor]');let items=[];
    const refresh=async()=>{items=await load(c.companyId);list.innerHTML=items.length?items.map(i=>`<div class="tos-pb-row"><div class="tos-pb-row-main"><strong>${esc(i.name)}</strong><small>${esc(i.description||i.category||i.unit||'each')}</small></div><div class="tos-pb-row-actions"><span class="tos-pb-price">${money.format(Number(i.unit_price||0))}</span><button class="tos-pb-edit" type="button" data-edit="${esc(i.id)}">Edit</button></div></div>`).join(''):'<p class="tos-pb-empty">No saved prices yet.</p>';list.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>edit(items.find(i=>i.id===b.dataset.edit))));await onChanged?.();};
    const edit=item=>{editor.innerHTML=`<form class="tos-pb-form"><div class="tos-pb-grid"><div class="tos-pb-field full"><label>Item name</label><input name="name" value="${esc(item?.name||'')}" placeholder="e.g. Double socket" required></div><div class="tos-pb-field full"><label>Description</label><input name="description" value="${esc(item?.description||'')}"></div><div class="tos-pb-field"><label>Price (£)</label><input name="price" type="number" min="0" step="0.01" value="${esc(item?.unit_price??0)}" required></div><div class="tos-pb-field"><label>VAT</label><select name="vat">${[0,5,20].map(v=>`<option value="${v}" ${Number(item?.vat_rate??20)===v?'selected':''}>${v}%</option>`).join('')}</select></div><div class="tos-pb-field"><label>Unit</label><select name="unit">${['each','hour','day','metre','job'].map(v=>`<option ${item?.unit===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="tos-pb-field"><label>Category</label><input name="category" value="${esc(item?.category||'')}" placeholder="Electrical"></div></div><div class="tos-pb-actions">${item?'<button type="button" class="tos-pb-btn danger" data-delete>Delete</button>':''}<button type="button" class="tos-pb-btn" data-cancel>Cancel</button><button class="tos-pb-btn primary" type="submit">Save</button></div></form>`;
      const f=editor.querySelector('form');f.querySelector('[data-cancel]').addEventListener('click',()=>editor.innerHTML='');f.querySelector('[data-delete]')?.addEventListener('click',async()=>{const r=await sb.from('price_book_items').delete().eq('id',item.id).eq('company_id',c.companyId);if(r.error){toast(r.error.message);return;}editor.innerHTML='';await refresh();toast('Saved item deleted');});
      f.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(f),payload={company_id:c.companyId,name:String(fd.get('name')||'').trim(),description:String(fd.get('description')||'').trim()||null,unit_price:Number(fd.get('price')||0),vat_rate:Number(fd.get('vat')||0),unit:String(fd.get('unit')||'each'),category:String(fd.get('category')||'').trim()||null,active:true,updated_at:new Date().toISOString()};let r=item?await sb.from('price_book_items').update(payload).eq('id',item.id).eq('company_id',c.companyId):await sb.from('price_book_items').insert(payload);if(r.error){toast(r.error.code==='23505'?'That item name is already saved':r.error.message);return;}editor.innerHTML='';await refresh();toast('Price book saved');});};
    overlay.querySelector('.tos-pb-add').addEventListener('click',()=>edit(null));await refresh();
  }
  startWatcher();
})();