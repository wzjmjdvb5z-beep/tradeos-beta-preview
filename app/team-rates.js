(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const SUPABASE_KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  let busy=false;

  function start(){
    if(!client)return;
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    schedule();
  }

  function schedule(){
    if(busy)return;
    requestAnimationFrame(mount);
  }

  async function mount(){
    if(busy)return;
    const active=document.querySelector('[data-nav="team"].active');
    const wrap=document.querySelector('main.wrap');
    if(!active||!wrap||wrap.querySelector('.tos-rates-card'))return;
    busy=true;
    try{
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError||!user)return;
      let companyId=document.querySelector('#company')?.value||null;
      if(!companyId){
        const {data:mine,error:mineError}=await client.from('company_members').select('company_id,role').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
        if(mineError||!mine)return;
        companyId=mine.company_id;
      }
      const {data:me,error:meError}=await client.from('company_members').select('role').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      if(meError||!me||!['owner','admin'].includes(me.role))return;
      const {data:members,error}=await client.from('company_members').select('id,full_name,role,hourly_cost,user_id').eq('company_id',companyId).eq('active',true).order('created_at',{ascending:true});
      if(error)throw error;

      const card=document.createElement('section');
      card.className='card section tos-rates-card';
      card.innerHTML=`<div class="section-head"><div><h3>Hourly rates</h3><p>Set the labour rate used for each person's approved timesheets and job profitability.</p></div></div><div class="tos-rate-note">Rates are individual. When a week is approved, TradeOS snapshots that person's current rate onto the approved timesheet, so future rate changes do not alter historic job costs.</div><div class="tos-rates-list">${(members||[]).map(memberRow).join('')}</div>`;
      const teamGrid=wrap.querySelector('.team-grid');
      if(teamGrid)wrap.insertBefore(card,teamGrid);else wrap.appendChild(card);

      card.querySelectorAll('[data-rate-save]').forEach(btn=>btn.addEventListener('click',()=>saveRate(btn,companyId)));
      document.querySelectorAll('.cost-input,[data-save-cost]').forEach(el=>el.closest('.toolbar')?.classList.add('tos-old-cost-control'));
      enhanceReviewCards();
    }catch(err){
      console.warn('TradeOS hourly rates:',err);
    }finally{busy=false;}
  }

  function memberRow(member){
    const value=member.hourly_cost==null?'':Number(member.hourly_cost).toFixed(2).replace(/\.00$/,'');
    const inputId=`tos-rate-${member.id}`;
    return `<div class="tos-rate-row"><div class="tos-rate-person"><strong>${esc(member.full_name||'Unnamed member')}</strong><small>${esc(member.role)}${member.role==='owner'?' · working owner':''}</small><div class="tos-rate-saved" data-rate-status="${esc(member.id)}"></div></div><div class="tos-rate-field"><label for="${esc(inputId)}">Hourly rate (£/hr)</label><small>Used to calculate labour cost from approved timesheets.</small><div class="tos-rate-editor"><div class="tos-rate-input-wrap"><span>£</span><input id="${esc(inputId)}" class="tos-rate-input" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" value="${esc(value)}" data-rate-input="${esc(member.id)}" aria-label="Hourly rate for ${esc(member.full_name||'member')}"></div><button class="tos-rate-save" data-rate-save="${esc(member.id)}">Save</button></div></div></div>`;
  }

  async function saveRate(btn,companyId){
    const memberId=btn.dataset.rateSave;
    const input=document.querySelector(`[data-rate-input="${cssEsc(memberId)}"]`);
    const status=document.querySelector(`[data-rate-status="${cssEsc(memberId)}"]`);
    const raw=String(input?.value??'').trim();
    const value=raw===''?null:Number(raw);
    if(value!==null&&(!Number.isFinite(value)||value<0)){
      if(status)status.textContent='Enter a valid rate';
      return;
    }
    const old=btn.textContent;
    try{
      btn.disabled=true;btn.textContent='Saving…';
      const {error}=await client.from('company_members').update({hourly_cost:value}).eq('company_id',companyId).eq('id',memberId);
      if(error)throw error;
      if(status)status.textContent=value==null?'Rate cleared':`Saved at £${value.toFixed(2)}/hr`;
      enhanceReviewCards();
      setTimeout(()=>{if(status)status.textContent=''},2200);
    }catch(err){
      if(status)status.textContent=String(err?.message||'Could not save rate');
    }finally{
      btn.disabled=false;btn.textContent=old;
    }
  }

  function enhanceReviewCards(){
    document.querySelectorAll('[data-review]').forEach(button=>{
      const item=button.closest('.item');
      if(!item||item.querySelector('.tos-review-cost'))return;
      const small=[...item.querySelectorAll('.item-main small')].find(x=>/hours.*£.*\/hr/i.test(x.textContent||''));
      if(!small)return;
      const text=small.textContent||'';
      const h=text.match(/([0-9]+(?:\.[0-9]+)?)\s*hours/i);
      const r=text.match(/£\s*([0-9]+(?:\.[0-9]+)?)\s*\/hr/i);
      if(!h||!r)return;
      const total=Number(h[1])*Number(r[1]);
      const line=document.createElement('small');
      line.className='tos-review-cost';
      line.textContent=`Estimated labour cost on approval: £${total.toFixed(2)}`;
      small.insertAdjacentElement('afterend',line);
    });
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function cssEsc(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();