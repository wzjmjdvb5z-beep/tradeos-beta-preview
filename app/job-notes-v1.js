(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false,busy=false,lastJobId=null,lastJobTitle='';
  const signedUrlCache=new Map();
  const dtFmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount();});
  }

  document.addEventListener('pointerdown',rememberJob,true);
  document.addEventListener('click',rememberJob,true);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const card=e.target.closest?.('.job-detail-list-card[data-job-id]');
    if(card){lastJobId=card.dataset.jobId||null;lastJobTitle=card.querySelector('.item-main > strong')?.textContent?.trim()||'';}
  },true);

  function rememberJob(e){
    const card=e.target.closest?.('.job-detail-list-card[data-job-id]');
    if(!card)return;
    lastJobId=card.dataset.jobId||null;
    lastJobTitle=card.querySelector('.item-main > strong')?.textContent?.trim()||'';
  }

  async function mount(){
    const page=document.querySelector('.tos-job-detail .tos-job-detail-page');
    if(!page||busy)return;
    const body=page.querySelector('.tos-job-body');
    if(!body)return;

    const title=page.querySelector('.tos-job-head-copy h2')?.textContent?.trim()||lastJobTitle||'Job';
    let jobId=lastJobId;
    if(!jobId){
      const match=[...document.querySelectorAll('.job-detail-list-card[data-job-id]')].find(card=>card.querySelector('.item-main > strong')?.textContent?.trim()===title);
      jobId=match?.dataset.jobId||null;
    }
    if(!jobId)return;

    const existing=body.querySelector('.tos-job-updates[data-job-id]');
    if(existing?.dataset.jobId===jobId)return;
    existing?.remove();

    const section=document.createElement('section');
    section.className='tos-job-section tos-job-updates';
    section.dataset.jobId=jobId;
    section.innerHTML=`
      <div class="tos-job-section-head tos-job-updates-head">
        <div><span>NOTES & PHOTOS</span><h3>Job updates</h3></div>
        <button type="button" class="tos-job-add-update">+ Add update</button>
      </div>
      <p class="tos-job-updates-help">Shared notes and site photos for everyone working on this job.</p>
      <div class="tos-job-updates-list"><div class="tos-job-update-loading"><i></i><span>Loading updates…</span></div></div>`;

    const time=body.querySelector('#tos-job-time');
    if(time)time.insertAdjacentElement('afterend',section);
    else body.appendChild(section);

    section.querySelector('.tos-job-add-update')?.addEventListener('click',()=>openComposer(jobId,title));

    busy=true;
    try{await loadUpdates(section,jobId);}catch(e){
      const list=section.querySelector('.tos-job-updates-list');
      if(list)list.innerHTML=`<div class="tos-job-updates-empty"><strong>Couldn’t load job updates</strong><p>${esc(e?.message||'Please try again.')}</p><button type="button" class="tos-job-update-retry">Try again</button></div>`;
      list?.querySelector('.tos-job-update-retry')?.addEventListener('click',()=>loadUpdates(section,jobId));
    }finally{busy=false;}
  }

  async function context(){
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)throw new Error('Please sign in again.');
    let companyId=document.querySelector('#company')?.value||null;
    let membership=null;
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

  async function loadUpdates(section,jobId){
    if(!section?.isConnected)return;
    const ctx=await context();
    const [notesResult,membersResult]=await Promise.all([
      client.from('job_notes')
        .select('id,company_id,job_id,created_by,body,created_at,updated_at,job_note_files(id,storage_path,file_name,mime_type,size_bytes,created_at,created_by)')
        .eq('company_id',ctx.companyId).eq('job_id',jobId).order('created_at',{ascending:false}).limit(100),
      client.from('company_members').select('user_id,full_name,role').eq('company_id',ctx.companyId).eq('active',true)
    ]);
    if(notesResult.error)throw notesResult.error;
    if(membersResult.error)throw membersResult.error;

    const notes=notesResult.data||[];
    const members=membersResult.data||[];
    const paths=notes.flatMap(n=>(n.job_note_files||[]).map(f=>f.storage_path)).filter(Boolean);
    const urls=await signedUrls(paths);
    const canManage=['owner','admin','manager'].includes(String(ctx.membership.role||'').toLowerCase());
    const list=section.querySelector('.tos-job-updates-list');
    if(!list)return;

    if(!notes.length){
      list.innerHTML=`<div class="tos-job-updates-empty"><div class="tos-job-updates-empty-icon">▧</div><strong>No job updates yet</strong><p>Add a note or site photo so everyone has the same job history.</p></div>`;
      return;
    }

    list.innerHTML=notes.map(note=>noteCard(note,members,urls,ctx.user.id,canManage)).join('');
    list.querySelectorAll('[data-job-note-photo]').forEach(btn=>btn.addEventListener('click',()=>openPhoto(btn.dataset.jobNotePhoto,btn.dataset.photoName||'Job photo')));
    list.querySelectorAll('[data-delete-job-note]').forEach(btn=>btn.addEventListener('click',()=>confirmDelete(btn.dataset.deleteJobNote,jobId,section)));
  }

  async function signedUrls(paths){
    const out=new Map();
    await Promise.all([...new Set(paths)].map(async path=>{
      const cached=signedUrlCache.get(path);
      if(cached&&cached.expires>Date.now()+60000){out.set(path,cached.url);return;}
      const r=await client.storage.from('job-notes').createSignedUrl(path,21600);
      if(!r.error&&r.data?.signedUrl){
        signedUrlCache.set(path,{url:r.data.signedUrl,expires:Date.now()+21500000});
        out.set(path,r.data.signedUrl);
      }
    }));
    return out;
  }

  function noteCard(note,members,urls,userId,canManage){
    const member=members.find(m=>m.user_id===note.created_by);
    const author=member?.full_name||pretty(member?.role)||'Team member';
    const files=note.job_note_files||[];
    const canDelete=note.created_by===userId||canManage;
    return `<article class="tos-job-update-card">
      <div class="tos-job-update-meta">
        <div class="tos-job-update-avatar">${initials(author)}</div>
        <div><strong>${esc(author)}</strong><span>${esc(dtFmt.format(new Date(note.created_at)))}</span></div>
        ${canDelete?`<button type="button" class="tos-job-update-delete" data-delete-job-note="${esc(note.id)}" aria-label="Delete this update">•••</button>`:''}
      </div>
      ${note.body?`<p class="tos-job-update-body">${esc(note.body)}</p>`:''}
      ${files.length?`<div class="tos-job-update-photos ${files.length===1?'one':''}">${files.map(file=>{
        const url=urls.get(file.storage_path)||'';
        return url?`<button type="button" class="tos-job-update-photo" data-job-note-photo="${esc(url)}" data-photo-name="${esc(file.file_name||'Job photo')}"><img src="${esc(url)}" alt="${esc(file.file_name||'Job photo')}" loading="lazy"><span>View</span></button>`:`<div class="tos-job-update-photo tos-job-photo-unavailable"><span>Photo</span></div>`;
      }).join('')}</div>`:''}
    </article>`;
  }

  function openComposer(jobId,title){
    document.querySelector('.tos-job-note-sheet')?.remove();
    let chosen=[];
    const sheet=document.createElement('div');
    sheet.className='tos-job-note-sheet';
    sheet.innerHTML=`<div class="tos-job-note-panel" role="dialog" aria-modal="true" aria-label="Add job update">
      <div class="tos-job-note-handle"></div>
      <div class="tos-job-note-head"><div><span>JOB UPDATE</span><h3>${esc(title||'Job')}</h3><p>Add information or photos for the whole team.</p></div><button type="button" class="tos-job-note-close" aria-label="Close">×</button></div>
      <form class="tos-job-note-form">
        <label class="tos-job-note-field"><span>Note <small>optional if adding photos</small></span><textarea name="body" rows="4" maxlength="5000" placeholder="e.g. First fix complete, customer requested an extra socket in bedroom 2…"></textarea></label>
        <div class="tos-job-photo-picker">
          <input type="file" id="tos-job-photo-input" accept="image/*" multiple hidden>
          <button type="button" class="tos-job-photo-add">＋ <span>Add photos</span></button>
          <div><strong>Site photos</strong><small>Up to 6 photos · 15 MB each</small></div>
        </div>
        <div class="tos-job-photo-previews" hidden></div>
        <div class="tos-job-note-error" hidden></div>
        <button type="submit" class="tos-job-note-save">Save update</button>
      </form>
    </div>`;
    document.body.appendChild(sheet);document.body.classList.add('tos-job-note-open');

    const input=sheet.querySelector('#tos-job-photo-input');
    const previews=sheet.querySelector('.tos-job-photo-previews');
    const error=sheet.querySelector('.tos-job-note-error');
    const close=()=>{chosen.forEach(x=>x.url&&URL.revokeObjectURL(x.url));sheet.remove();document.body.classList.remove('tos-job-note-open');};
    sheet.querySelector('.tos-job-note-close')?.addEventListener('click',close);
    sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
    sheet.querySelector('.tos-job-photo-add')?.addEventListener('click',()=>input?.click());

    input?.addEventListener('change',()=>{
      const incoming=[...input.files||[]];
      const room=Math.max(0,6-chosen.length);
      const valid=[];
      for(const file of incoming.slice(0,room)){
        if(!String(file.type||'').startsWith('image/'))continue;
        if(file.size>15728640){showSheetError(error,`${file.name||'A photo'} is over 15 MB.`);continue;}
        valid.push({file,url:URL.createObjectURL(file),id:uid()});
      }
      chosen.push(...valid);input.value='';renderPreviews();
    });

    function renderPreviews(){
      previews.hidden=!chosen.length;
      previews.innerHTML=chosen.map(x=>`<div class="tos-job-photo-preview"><img src="${esc(x.url)}" alt="Selected photo"><button type="button" data-remove-photo="${esc(x.id)}" aria-label="Remove photo">×</button></div>`).join('');
      previews.querySelectorAll('[data-remove-photo]').forEach(btn=>btn.addEventListener('click',()=>{
        const idx=chosen.findIndex(x=>x.id===btn.dataset.removePhoto);
        if(idx>=0){const [removed]=chosen.splice(idx,1);if(removed?.url)URL.revokeObjectURL(removed.url);renderPreviews();}
      }));
    }

    sheet.querySelector('.tos-job-note-form')?.addEventListener('submit',async e=>{
      e.preventDefault();
      const body=String(e.currentTarget.elements.body.value||'').trim();
      if(!body&&!chosen.length){showSheetError(error,'Add a note or at least one photo.');return;}
      const save=sheet.querySelector('.tos-job-note-save');
      save.disabled=true;save.textContent=chosen.length?'Saving & uploading…':'Saving…';error.hidden=true;
      try{
        await saveUpdate(jobId,body,chosen.map(x=>x.file));
        close();
        toast('Job update added');
        const section=document.querySelector(`.tos-job-updates[data-job-id="${css(jobId)}"]`);
        if(section)await loadUpdates(section,jobId);
      }catch(x){save.disabled=false;save.textContent='Save update';showSheetError(error,x?.message||'Could not save this update.');}
    });
  }

  async function saveUpdate(jobId,body,files){
    const ctx=await context();
    const jr=await client.from('jobs').select('id,company_id').eq('id',jobId).eq('company_id',ctx.companyId).maybeSingle();
    if(jr.error)throw jr.error;
    if(!jr.data)throw new Error('This job is no longer available.');

    const noteResult=await client.from('job_notes').insert({company_id:ctx.companyId,job_id:jobId,created_by:ctx.user.id,body:body||null}).select('id').single();
    if(noteResult.error)throw noteResult.error;
    const noteId=noteResult.data.id;
    const uploaded=[];
    try{
      for(const file of files){
        const path=`${ctx.companyId}/${jobId}/${noteId}/${ctx.user.id}/${uid()}-${safeName(file.name||'photo')}`;
        const upload=await client.storage.from('job-notes').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
        if(upload.error)throw upload.error;
        uploaded.push({path,file});
      }
      if(uploaded.length){
        const rows=uploaded.map(({path,file})=>({company_id:ctx.companyId,job_id:jobId,note_id:noteId,created_by:ctx.user.id,storage_path:path,file_name:file.name||'Job photo',mime_type:file.type||null,size_bytes:file.size||null}));
        const meta=await client.from('job_note_files').insert(rows);
        if(meta.error)throw meta.error;
      }
    }catch(e){
      if(uploaded.length)await client.storage.from('job-notes').remove(uploaded.map(x=>x.path));
      await client.from('job_notes').delete().eq('id',noteId).eq('created_by',ctx.user.id);
      throw e;
    }
    return noteId;
  }

  function confirmDelete(noteId,jobId,section){
    document.querySelector('.tos-job-note-confirm')?.remove();
    const modal=document.createElement('div');modal.className='tos-job-note-confirm';
    modal.innerHTML=`<div class="tos-job-note-confirm-card" role="dialog" aria-modal="true"><h3>Delete this update?</h3><p>The note and any attached photos will be removed from the job history.</p><div><button type="button" class="tos-job-note-confirm-cancel">Cancel</button><button type="button" class="tos-job-note-confirm-delete">Delete</button></div></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();
    modal.querySelector('.tos-job-note-confirm-cancel')?.addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.querySelector('.tos-job-note-confirm-delete')?.addEventListener('click',async e=>{
      const btn=e.currentTarget;btn.disabled=true;btn.textContent='Deleting…';
      try{
        const ctx=await context();
        const fr=await client.from('job_note_files').select('storage_path').eq('company_id',ctx.companyId).eq('note_id',noteId);
        if(fr.error)throw fr.error;
        const paths=(fr.data||[]).map(x=>x.storage_path).filter(Boolean);
        if(paths.length){const sr=await client.storage.from('job-notes').remove(paths);if(sr.error)throw sr.error;}
        const nr=await client.from('job_notes').delete().eq('company_id',ctx.companyId).eq('id',noteId);
        if(nr.error)throw nr.error;
        paths.forEach(p=>signedUrlCache.delete(p));
        close();toast('Job update deleted');await loadUpdates(section,jobId);
      }catch(x){btn.disabled=false;btn.textContent='Delete';toast(x?.message||'Could not delete this update',true);}
    });
  }

  function openPhoto(url,name){
    document.querySelector('.tos-job-photo-viewer')?.remove();
    const viewer=document.createElement('div');viewer.className='tos-job-photo-viewer';
    viewer.innerHTML=`<div class="tos-job-photo-viewer-top"><strong>${esc(name||'Job photo')}</strong><button type="button" aria-label="Close">×</button></div><div class="tos-job-photo-viewer-body"><img src="${esc(url)}" alt="${esc(name||'Job photo')}"></div>`;
    document.body.appendChild(viewer);document.body.classList.add('tos-job-photo-viewer-open');
    const close=()=>{viewer.remove();document.body.classList.remove('tos-job-photo-viewer-open');};
    viewer.querySelector('button')?.addEventListener('click',close);
    viewer.addEventListener('click',e=>{if(e.target===viewer||e.target.classList.contains('tos-job-photo-viewer-body'))close();});
  }

  function showSheetError(el,text){if(!el)return;el.textContent=text;el.hidden=false;}
  function toast(message,error=false){
    document.querySelector('.tos-job-notes-toast')?.remove();
    const t=document.createElement('div');t.className=`tos-job-notes-toast${error?' error':''}`;t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
  }
  function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;}
  function safeName(name){return String(name||'photo').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-90)||'photo.jpg';}
  function initials(v){const p=String(v||'?').trim().split(/\s+/).filter(Boolean);return esc((p[0]?.[0]||'?')+(p.length>1?(p[p.length-1]?.[0]||''):''));}
  function pretty(v){return String(v||'').replace(/(^|[_-])(\w)/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function css(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelector('.tos-job-photo-viewer button')?.click()||document.querySelector('.tos-job-note-sheet .tos-job-note-close')?.click();}});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
