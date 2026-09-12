(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let lastJobId=null,scheduled=false;
  const loading=new Set();
  const whenFmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  document.addEventListener('pointerdown',rememberJob,true);
  document.addEventListener('click',rememberJob,true);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  schedule();

  function rememberJob(e){
    const card=e.target.closest?.('.job-detail-list-card[data-job-id]');
    if(card)lastJobId=card.dataset.jobId||null;
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;mount();});
  }

  function resolveJobId(page){
    if(lastJobId)return lastJobId;
    const title=page.querySelector('.tos-job-head-copy h2')?.textContent?.trim();
    if(!title)return null;
    const card=[...document.querySelectorAll('.job-detail-list-card[data-job-id]')].find(x=>x.querySelector('.item-main > strong')?.textContent?.trim()===title);
    return card?.dataset.jobId||null;
  }

  async function mount(){
    const page=document.querySelector('.tos-job-detail .tos-job-detail-page');
    const body=page?.querySelector('.tos-job-body');
    if(!page||!body)return;
    const jobId=resolveJobId(page);
    if(!jobId)return;
    if(body.querySelector(`.tos-job-notes-inline[data-job-id="${jobId}"]`))return;
    if(loading.has(jobId))return;

    const title=page.querySelector('.tos-job-head-copy h2')?.textContent?.trim()||'Job';
    const section=document.createElement('section');
    section.className='tos-job-section tos-job-notes-inline';
    section.dataset.jobId=jobId;
    section.innerHTML=`
      <div class="tos-job-section-head tos-inline-notes-head">
        <div><span>NOTES & PHOTOS</span><h3>Job updates</h3></div>
        <button type="button" class="tos-inline-note-toggle">+ Add update</button>
      </div>
      <p class="tos-inline-notes-help">Shared information and site photos for everyone working on this job.</p>
      <form class="tos-inline-note-form" hidden>
        <label><span>Update</span><textarea name="body" rows="3" maxlength="5000" placeholder="e.g. First fix complete, customer requested an extra socket…"></textarea></label>
        <label class="tos-inline-photo-field"><span>Photos</span><input name="photos" type="file" accept="image/*" multiple><small>Up to 6 photos · 15 MB each</small></label>
        <div class="tos-inline-selected" hidden></div>
        <div class="tos-inline-note-error" hidden></div>
        <div class="tos-inline-note-actions"><button type="button" class="tos-inline-note-cancel">Cancel</button><button type="submit" class="tos-inline-note-save">Save update</button></div>
      </form>
      <div class="tos-inline-notes-list"><div class="tos-inline-notes-loading">Loading job updates…</div></div>`;

    const time=body.querySelector('#tos-job-time');
    const customer=body.querySelector('.tos-job-customer');
    if(time)time.insertAdjacentElement('afterend',section);
    else if(customer)customer.insertAdjacentElement('beforebegin',section);
    else body.appendChild(section);

    const form=section.querySelector('.tos-inline-note-form');
    const toggle=section.querySelector('.tos-inline-note-toggle');
    const fileInput=form.elements.photos;
    const selected=section.querySelector('.tos-inline-selected');
    const errorBox=section.querySelector('.tos-inline-note-error');

    const closeComposer=()=>{
      form.hidden=true;
      toggle.textContent='+ Add update';
      errorBox.hidden=true;
      errorBox.textContent='';
    };
    toggle.addEventListener('click',()=>{
      form.hidden=!form.hidden;
      toggle.textContent=form.hidden?'+ Add update':'Close';
      if(!form.hidden)form.elements.body.focus();
    });
    section.querySelector('.tos-inline-note-cancel').addEventListener('click',closeComposer);
    fileInput.addEventListener('change',()=>{
      const files=[...fileInput.files||[]];
      selected.hidden=!files.length;
      selected.textContent=files.length?`${Math.min(files.length,6)} photo${Math.min(files.length,6)===1?'':'s'} selected`:'';
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const bodyText=String(form.elements.body.value||'').trim();
      const files=[...fileInput.files||[]].slice(0,6);
      if(!bodyText&&!files.length){showError(errorBox,'Add a note or at least one photo.');return;}
      const oversize=files.find(f=>f.size>15728640);
      if(oversize){showError(errorBox,`${oversize.name||'A photo'} is over 15 MB.`);return;}
      const save=section.querySelector('.tos-inline-note-save');
      save.disabled=true;save.textContent=files.length?'Saving & uploading…':'Saving…';errorBox.hidden=true;
      try{
        await saveUpdate(jobId,bodyText,files);
        form.reset();selected.hidden=true;selected.textContent='';closeComposer();
        await loadNotes(section,jobId);
        toast('Job update added');
      }catch(err){showError(errorBox,err?.message||'Could not save this update.');}
      finally{save.disabled=false;save.textContent='Save update';}
    });

    loading.add(jobId);
    try{await loadNotes(section,jobId);}catch(err){
      const list=section.querySelector('.tos-inline-notes-list');
      if(list)list.innerHTML=`<div class="tos-inline-notes-empty"><strong>Couldn’t load job updates</strong><p>${esc(err?.message||'Please try again.')}</p></div>`;
    }finally{loading.delete(jobId);}
  }

  async function context(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)throw new Error('Please sign in again.');
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      if(r.error)throw r.error;membership=r.data||null;
    }
    if(!membership){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(r.error)throw r.error;membership=r.data||null;companyId=membership?.company_id||null;
    }
    if(!membership||!companyId)throw new Error('Workspace not found.');
    return {user,companyId,membership};
  }

  async function loadNotes(section,jobId){
    if(!section?.isConnected)return;
    const ctx=await context();
    const [nr,mr]=await Promise.all([
      client.from('job_notes').select('id,body,created_by,created_at,job_note_files(id,storage_path,file_name,mime_type,size_bytes)').eq('company_id',ctx.companyId).eq('job_id',jobId).order('created_at',{ascending:false}).limit(100),
      client.from('company_members').select('user_id,full_name,role').eq('company_id',ctx.companyId).eq('active',true)
    ]);
    if(nr.error)throw nr.error;if(mr.error)throw mr.error;
    const notes=nr.data||[],members=mr.data||[];
    const paths=notes.flatMap(n=>(n.job_note_files||[]).map(f=>f.storage_path)).filter(Boolean);
    const urls=new Map();
    await Promise.all(paths.map(async path=>{
      const r=await client.storage.from('job-notes').createSignedUrl(path,3600);
      if(!r.error&&r.data?.signedUrl)urls.set(path,r.data.signedUrl);
    }));
    const list=section.querySelector('.tos-inline-notes-list');
    if(!list)return;
    if(!notes.length){
      list.innerHTML='<div class="tos-inline-notes-empty"><strong>No job updates yet</strong><p>Add notes or site photos so the whole team has the same job history.</p></div>';
      return;
    }
    list.innerHTML=notes.map(n=>noteCard(n,members,urls)).join('');
  }

  function noteCard(note,members,urls){
    const member=members.find(m=>m.user_id===note.created_by);
    const author=member?.full_name||pretty(member?.role)||'Team member';
    const files=note.job_note_files||[];
    return `<article class="tos-inline-note-card">
      <div class="tos-inline-note-meta"><div class="tos-inline-note-avatar">${initials(author)}</div><div><strong>${esc(author)}</strong><span>${esc(whenFmt.format(new Date(note.created_at)))}</span></div></div>
      ${note.body?`<p class="tos-inline-note-body">${esc(note.body)}</p>`:''}
      ${files.length?`<div class="tos-inline-note-photos">${files.map(f=>{const url=urls.get(f.storage_path);return url?`<img src="${esc(url)}" alt="${esc(f.file_name||'Job photo')}" loading="lazy">`:'';}).join('')}</div>`:''}
    </article>`;
  }

  async function saveUpdate(jobId,body,files){
    const ctx=await context();
    const job=await client.from('jobs').select('id,company_id').eq('id',jobId).eq('company_id',ctx.companyId).maybeSingle();
    if(job.error)throw job.error;if(!job.data)throw new Error('This job is no longer available.');
    const nr=await client.from('job_notes').insert({company_id:ctx.companyId,job_id:jobId,created_by:ctx.user.id,body:body||null}).select('id').single();
    if(nr.error)throw nr.error;
    const noteId=nr.data.id,uploaded=[];
    try{
      for(const file of files){
        const path=`${ctx.companyId}/${jobId}/${noteId}/${ctx.user.id}/${uid()}-${safeName(file.name||'photo')}`;
        const ur=await client.storage.from('job-notes').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
        if(ur.error)throw ur.error;
        uploaded.push({path,file});
      }
      if(uploaded.length){
        const rows=uploaded.map(({path,file})=>({company_id:ctx.companyId,job_id:jobId,note_id:noteId,created_by:ctx.user.id,storage_path:path,file_name:file.name||'Job photo',mime_type:file.type||null,size_bytes:file.size||null}));
        const fr=await client.from('job_note_files').insert(rows);if(fr.error)throw fr.error;
      }
    }catch(err){
      if(uploaded.length)await client.storage.from('job-notes').remove(uploaded.map(x=>x.path));
      await client.from('job_notes').delete().eq('id',noteId).eq('created_by',ctx.user.id);
      throw err;
    }
  }

  function showError(el,msg){el.textContent=msg;el.hidden=false;}
  function toast(msg){document.querySelector('.tos-inline-notes-toast')?.remove();const x=document.createElement('div');x.className='tos-inline-notes-toast';x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),2000);}
  function safeName(v){return String(v||'photo').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100);}
  function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;}
  function pretty(v){return String(v||'').replace(/(^|[_-])(\w)/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function initials(v){const p=String(v||'?').trim().split(/\s+/).filter(Boolean);return esc(((p[0]?.[0]||'?')+(p.length>1?(p[p.length-1]?.[0]||''):'')).toUpperCase());}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
})();
