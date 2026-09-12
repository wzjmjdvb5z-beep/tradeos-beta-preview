(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;
  let queued=false,busy=false,state=null;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}
  async function context(){
    const {data:{user}}=await client.auth.getUser();if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();membership=r.data;}
    if(!membership){const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();membership=r.data;companyId=membership?.company_id||null;}
    return membership&&companyId?{companyId,membership}:null;
  }
  async function mount(){
    const controls=[...document.querySelectorAll('[data-assign-sel]')];
    if(!controls.length||busy)return;
    const fresh=controls.filter(x=>!x.closest('.item')?.dataset.teamCleanMounted);if(!fresh.length)return;
    busy=true;
    try{
      const ctx=await context();if(!ctx||!['owner','admin','manager'].includes(ctx.membership.role))return;
      const [mr,ar]=await Promise.all([
        client.from('company_members').select('id,full_name,role,active').eq('company_id',ctx.companyId).eq('active',true).order('created_at',{ascending:true}),
        client.from('job_assignments').select('id,job_id,member_id').eq('company_id',ctx.companyId)
      ]);
      if(mr.error||ar.error)return;
      state={companyId:ctx.companyId,members:mr.data||[],assignments:ar.data||[]};
      fresh.forEach(sel=>enhance(sel));
    }finally{busy=false;}
  }
  function enhance(sel){
    const card=sel.closest('.item');if(!card)return;card.dataset.teamCleanMounted='1';card.classList.add('job-team-card');
    const jobId=sel.dataset.assignSel,main=card.querySelector('.item-main'),oldToolbar=sel.closest('.toolbar');
    if(oldToolbar)oldToolbar.hidden=true;
    card.querySelector('.assigns')?.classList.add('job-team-old-assigns');
    let row=document.createElement('div');row.className='job-team-row';row.dataset.jobTeamRow=jobId;main?.appendChild(row);drawRow(jobId,row);
  }
  function assigned(jobId){const ids=new Set(state.assignments.filter(a=>a.job_id===jobId).map(a=>a.member_id));return state.members.filter(m=>ids.has(m.id));}
  function drawRow(jobId,row){
    const people=assigned(jobId);row.innerHTML=`<div class="job-team-summary"><span>Assigned to</span><strong>${people.length?esc(people.map(p=>p.full_name||pretty(p.role)).join(', ')):'Nobody yet'}</strong></div><button type="button" class="job-team-manage">${people.length?'Manage team':'Assign team'} <span>›</span></button>`;
    row.querySelector('button').addEventListener('click',()=>openTeam(jobId));
  }
  function openTeam(jobId){
    document.querySelector('.job-team-overlay')?.remove();
    const current=new Set(state.assignments.filter(a=>a.job_id===jobId).map(a=>a.member_id));
    const o=document.createElement('div');o.className='job-team-overlay';
    o.innerHTML=`<div class="job-team-panel" role="dialog" aria-modal="true" aria-label="Manage job team"><div class="job-team-handle"></div><div class="job-team-head"><div><p class="eyebrow">JOB TEAM</p><h3>Manage team</h3><p>Choose everyone who should see and log time to this job.</p></div><button type="button" class="job-team-close" aria-label="Close">×</button></div><div class="job-team-people">${state.members.map(m=>`<label class="job-team-person"><input type="checkbox" value="${esc(m.id)}" ${current.has(m.id)?'checked':''}><span class="job-team-avatar">${initials(m.full_name||m.role)}</span><span><strong>${esc(m.full_name||pretty(m.role))}</strong><small>${esc(pretty(m.role))}</small></span><i></i></label>`).join('')}</div><div class="job-team-error" hidden></div><button type="button" class="job-team-save">Save team</button></div>`;
    document.body.appendChild(o);document.body.classList.add('job-team-open');
    const close=()=>{o.remove();document.body.classList.remove('job-team-open');};
    o.querySelector('.job-team-close').addEventListener('click',close);o.addEventListener('click',e=>{if(e.target===o)close();});
    o.querySelector('.job-team-save').addEventListener('click',async e=>{
      const btn=e.currentTarget,err=o.querySelector('.job-team-error'),next=new Set([...o.querySelectorAll('input:checked')].map(x=>x.value));
      const add=[...next].filter(x=>!current.has(x)),remove=[...current].filter(x=>!next.has(x));
      btn.disabled=true;btn.textContent='Saving…';err.hidden=true;
      try{
        if(add.length){const r=await client.from('job_assignments').upsert(add.map(member_id=>({company_id:state.companyId,job_id:jobId,member_id})),{onConflict:'job_id,member_id',ignoreDuplicates:true});if(r.error)throw r.error;}
        if(remove.length){const r=await client.from('job_assignments').delete().eq('company_id',state.companyId).eq('job_id',jobId).in('member_id',remove);if(r.error)throw r.error;}
        state.assignments=state.assignments.filter(a=>a.job_id!==jobId||!remove.includes(a.member_id));
        add.forEach(member_id=>state.assignments.push({id:`local-${jobId}-${member_id}`,job_id:jobId,member_id}));
        const row=document.querySelector(`[data-job-team-row="${css(jobId)}"]`);if(row)drawRow(jobId,row);
        close();toast('Job team updated');
      }catch(x){btn.disabled=false;btn.textContent='Save team';err.textContent=x?.message||'Could not update this job team.';err.hidden=false;}
    });
  }
  function toast(m){document.querySelector('.job-team-toast')?.remove();const t=document.createElement('div');t.className='job-team-toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200);}
  function pretty(v){return String(v||'').replace(/(^|[_-])(\w)/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function initials(v){const p=String(v||'?').trim().split(/\s+/).filter(Boolean);return esc((p[0]?.[0]||'?')+(p.length>1?(p[p.length-1]?.[0]||''):''));}
  function css(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();