(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let queued=false,busy=false,contextCache=null,jobsCache=[];
  let current=null;
  const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
  const dateFmt=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const updateFmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const MAX_PHOTOS=6;
  const MAX_PHOTO_BYTES=15*1024*1024;

  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}

  async function getContext(){
    const {data:{user}}=await client.auth.getUser();
    if(!user)return null;
    let companyId=document.querySelector('#company')?.value||null,membership=null;
    if(companyId){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('company_id',companyId).eq('user_id',user.id).eq('active',true).maybeSingle();
      membership=r.data;
    }
    if(!membership){
      const r=await client.from('company_members').select('id,company_id,user_id,full_name,role,active').eq('user_id',user.id).eq('active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
      membership=r.data; companyId=membership?.company_id||null;
    }
    if(!membership||!companyId)return null;
    return {companyId,membership,user};
  }

  async function mount(){
    const list=document.querySelector('.jobs-list-clean');
    if(!list||busy)return;
    const pendingCards=[...list.querySelectorAll('.item')].some(card=>card.dataset.jobDetailMounted!=='1');
    if(!pendingCards)return;
    busy=true;
    try{
      const ctx=await getContext();
      if(!ctx)return;
      if(!contextCache||contextCache.companyId!==ctx.companyId){contextCache=ctx;jobsCache=[];}
      if(!jobsCache.length){
        const jr=await client.from('jobs').select('id,company_id,title,status,address,agreed_value,created_at').eq('company_id',ctx.companyId).order('created_at',{ascending:false}).limit(300);
        if(jr.error)return;
        jobsCache=jr.data||[];
      }
      const cards=[...list.querySelectorAll('.item')];
      cards.forEach(card=>enhanceCard(card));
      const p=list.querySelector(':scope > .section-head p');
      if(p&&p.textContent!=='Tap a job to open its people, time, updates and details.')p.textContent='Tap a job to open its people, time, updates and details.';
    }finally{busy=false;}
  }

  function enhanceCard(card){
    if(card.dataset.jobDetailMounted==='1')return;
    let jobId=card.querySelector('[data-assign-sel]')?.dataset.assignSel||null;
    let job=jobId?jobsCache.find(j=>j.id===jobId):null;
    if(!job){
      const title=card.querySelector('.item-main > strong')?.textContent?.trim();
      const address=card.querySelector('.item-main > small')?.textContent?.trim();
      job=jobsCache.find(j=>j.title===title && (!address||!j.address||address===j.address))||jobsCache.find(j=>j.title===title);
      jobId=job?.id||null;
    }
    if(!jobId)return;
    card.dataset.jobDetailMounted='1';
    card.dataset.jobId=jobId;
    card.classList.add('job-detail-list-card');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',`Open ${job?.title||'job'}`);
    card.querySelectorAll('.toolbar,.assigns,.job-team-row').forEach(x=>x.style.display='none');
    if(!card.querySelector('.job-detail-chevron')){
      const ch=document.createElement('span');ch.className='job-detail-chevron';ch.setAttribute('aria-hidden','true');ch.textContent='›';card.appendChild(ch);
    }
    const open=()=>openJob(jobId);
    card.addEventListener('click',e=>{if(e.target.closest('button,select,input,a'))return;open();});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  }

  async function openJob(jobId){
    closeJob();
    const o=document.createElement('div');
    o.className='tos-job-detail';
    o.innerHTML=`<div class="tos-job-detail-page"><div class="tos-job-detail-loading"><div class="tos-job-spinner"></div><strong>Opening job…</strong></div></div>`;
    document.body.appendChild(o);document.body.classList.add('tos-job-detail-open');
    try{
      await loadJob(jobId,o);
    }catch(e){
      if(e?.code==='JOB_NOT_FOUND'){
        jobsCache=[];contextCache=null;closeJob();
        document.dispatchEvent(new CustomEvent('tradeos:jobs-changed'));
        toast('That job was already removed. Your jobs have been refreshed.');
        return;
      }
      o.querySelector('.tos-job-detail-page').innerHTML=`<div class="tos-job-error"><button type="button" class="tos-job-back">‹ Back</button><h2>Couldn’t open this job</h2><p>${esc(e?.message||'Please try again.')}</p></div>`;
      o.querySelector('.tos-job-back')?.addEventListener('click',closeJob);
    }
  }

  async function loadJob(jobId,o){
    const ctx=await getContext(); if(!ctx)throw new Error('Your session has expired.');
    const [jr,mr,ar,tr,nr,fr]=await Promise.all([
      client.from('jobs').select('id,company_id,customer_id,title,status,address,scheduled_start,scheduled_end,notes,agreed_value,customers(name,email,phone,address)').eq('id',jobId).eq('company_id',ctx.companyId).limit(1).maybeSingle(),
      client.from('company_members').select('id,user_id,full_name,role,active').eq('company_id',ctx.companyId).eq('active',true).order('created_at',{ascending:true}),
      client.from('job_assignments').select('id,job_id,member_id').eq('company_id',ctx.companyId).eq('job_id',jobId),
      client.from('weekly_time_entries').select('id,user_id,weekly_timesheet_id,work_date,start_time,end_time,break_minutes,hours,notes,created_at').eq('company_id',ctx.companyId).eq('job_id',jobId).order('work_date',{ascending:false}).order('start_time',{ascending:false}).limit(300),
      client.from('job_notes').select('id,company_id,job_id,created_by,body,created_at,updated_at').eq('company_id',ctx.companyId).eq('job_id',jobId).order('created_at',{ascending:false}).limit(200),
      client.from('job_note_files').select('id,company_id,job_id,note_id,created_by,storage_path,file_name,mime_type,size_bytes,created_at').eq('company_id',ctx.companyId).eq('job_id',jobId).order('created_at',{ascending:true}).limit(600)
    ]);
    if(jr.error)throw jr.error;if(mr.error)throw mr.error;if(ar.error)throw ar.error;if(tr.error)throw tr.error;if(nr.error)throw nr.error;if(fr.error)throw fr.error;
    if(!jr.data){const error=new Error('This job is no longer available.');error.code='JOB_NOT_FOUND';throw error;}
    const state={ctx,job:jr.data,members:mr.data||[],assignments:ar.data||[],entries:tr.data||[],notes:nr.data||[],noteFiles:fr.data||[],photoUrls:{},overlay:o};
    if(['owner','admin','manager'].includes(ctx.membership.role)){
      const billing=await client.from('job_financials').select('billing_stage').eq('company_id',ctx.companyId).eq('job_id',jobId).maybeSingle();
      if(billing.error)throw billing.error;
      state.job.billing_stage=billing.data?.billing_stage||null;
    }
    current=state;
    await hydratePhotoUrls(state);
    if(current!==state||!o.isConnected)return;
    renderJob();
  }

  async function hydratePhotoUrls(state){
    const files=(state?.noteFiles||[]).filter(f=>f.storage_path);
    state.photoUrls={};
    if(!files.length)return;
    const paths=files.map(f=>f.storage_path);
    try{
      const r=await client.storage.from('job-notes').createSignedUrls(paths,3600);
      if(r.error)return;
      (r.data||[]).forEach((item,index)=>{
        const path=item?.path||paths[index];
        const file=files.find(f=>f.storage_path===path)||files[index];
        if(file&&item?.signedUrl)state.photoUrls[file.id]=item.signedUrl;
      });
    }catch(_){}
  }

  function renderJob(){
    if(!current?.overlay?.isConnected)return;
    const {job,members,assignments,entries,ctx}=current;
    const page=current.overlay.querySelector('.tos-job-detail-page');
    const manager=['owner','admin','manager'].includes(ctx.membership.role);
    const assignedIds=new Set(assignments.map(a=>a.member_id));
    const assigned=members.filter(m=>assignedIds.has(m.id));
    const totalHours=sum(entries.map(e=>num(e.hours)));
    const grouped=groupEntries(entries);
    const customer=job.customers||null;
    page.innerHTML=`
      <header class="tos-job-head">
        <button type="button" class="tos-job-back" aria-label="Back to jobs">‹</button>
        <div class="tos-job-head-copy"><span>JOB</span><h2>${esc(job.title||'Job')}</h2></div>
        <span class="tos-job-status">${esc(jobStage(job))}</span>
      </header>
      <main class="tos-job-body">
        ${manager?`<section class="tos-job-section"><div class="tos-job-section-head"><div><span>PROGRESS</span><h3>Job stage</h3></div></div><label for="tos-job-stage">Update stage</label><select id="tos-job-stage" class="btn secondary" style="width:100%;margin-top:8px">${['ready','in progress','complete','bill sent','bill paid'].map(v=>`<option value="${v}" ${jobStage(job).toLowerCase()===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select><p class="sub">Billing stages are private to managers. Changing a stage does not send an invoice or record a payment.</p><button type="button" class="btn" id="tos-save-job-stage">Save stage</button><p id="tos-job-action-error" role="alert" hidden></p><hr><button type="button" class="btn secondary" id="tos-delete-job" style="color:#b42318">Delete job</button><div id="tos-delete-confirm" hidden><p><strong>Permanently delete ${esc(job.title)}?</strong></p><p>This completely removes its schedule, assignments, time entries, invoices, payments, costs, updates and photos. This cannot be undone.</p><button type="button" class="btn secondary" id="tos-cancel-delete">Keep job</button> <button type="button" class="btn" id="tos-confirm-delete" style="background:#b42318">Delete everything</button></div></section>`:''}
        <section class="tos-job-hero-card">
          <div class="tos-job-address">${esc(job.address||customer?.address||'No address added')}</div>
          <div class="tos-job-metrics">
            ${manager?`<div><span>Value</span><strong>${gbp.format(num(job.agreed_value))}</strong></div>`:''}
            <div><span>Total time</span><strong>${hours(totalHours)}</strong></div>
            <div><span>People</span><strong>${assigned.length}</strong></div>
          </div>
          ${job.scheduled_start?`<div class="tos-job-schedule"><span>Scheduled</span><strong>${esc(formatSchedule(job.scheduled_start,job.scheduled_end))}</strong></div>`:''}
          ${job.notes?`<div class="tos-job-notes"><span>Job notes</span><p>${esc(job.notes)}</p></div>`:''}
        </section>

        <section class="tos-job-section" id="tos-job-people">
          <div class="tos-job-section-head"><div><span>TEAM</span><h3>People on this job</h3></div>${manager?'<button type="button" class="tos-job-manage-team">Manage</button>':''}</div>
          <div class="tos-job-people-list">${assigned.length?assigned.map(m=>personRow(m,entries)).join(''):`<div class="tos-job-empty"><strong>No one assigned yet</strong><p>${manager?'Tap Manage to add people to this job.':'No team members are assigned to this job.'}</p></div>`}</div>
        </section>

        <section class="tos-job-section" id="tos-job-time">
          <div class="tos-job-section-head"><div><span>TIME</span><h3>Time entered</h3></div><div class="tos-job-time-total"><strong>${hours(totalHours)}</strong><small>${entries.length} entr${entries.length===1?'y':'ies'}</small></div></div>
          <div class="tos-job-time-list">${entries.length?grouped.map(g=>dayGroup(g,members)).join(''):`<div class="tos-job-empty"><strong>No time entered yet</strong><p>Time logged from Timesheets will appear here against this job.</p></div>`}</div>
        </section>


        ${notesSectionHtml()}

        ${customer?`<section class="tos-job-section tos-job-customer"><div class="tos-job-section-head"><div><span>CUSTOMER</span><h3>${esc(customer.name||'Customer')}</h3></div></div><div class="tos-job-contact">${customer.email?`<span>${esc(customer.email)}</span>`:''}${customer.phone?`<span>${esc(customer.phone)}</span>`:''}${customer.address?`<span>${esc(customer.address)}</span>`:''}</div></section>`:''}
      </main>`;
    page.querySelector('.tos-job-back')?.addEventListener('click',closeJob);
    page.querySelector('.tos-job-manage-team')?.addEventListener('click',openManageTeam);
    page.querySelector('#tos-save-job-stage')?.addEventListener('click',()=>performJobAction('stage',page.querySelector('#tos-job-stage').value));
    page.querySelector('#tos-delete-job')?.addEventListener('click',()=>{page.querySelector('#tos-delete-confirm').hidden=false;page.querySelector('#tos-delete-job').hidden=true;page.querySelector('#tos-delete-confirm').scrollIntoView({block:'center'});page.querySelector('#tos-cancel-delete').focus({preventScroll:true});});
    page.querySelector('#tos-cancel-delete')?.addEventListener('click',()=>{page.querySelector('#tos-delete-confirm').hidden=true;page.querySelector('#tos-delete-job').hidden=false;});
    page.querySelector('#tos-confirm-delete')?.addEventListener('click',()=>performJobAction('delete'));
    bindNotesSection(page.querySelector('#tos-job-updates'));
  }

  function jobStage(job){const s=job.billing_stage||job.status||'ready';return s==='booked'?'Ready':s[0].toUpperCase()+s.slice(1);}
  async function performJobAction(action,stage=null){
    const state=current;
    if(!state||state.saving||!['owner','admin','manager'].includes(state.ctx.membership.role))return;
    state.saving=true;
    const buttons=state.overlay.querySelectorAll('#tos-save-job-stage,#tos-confirm-delete');
    buttons.forEach(b=>b.disabled=true);
    const deleteButton=state.overlay.querySelector('#tos-confirm-delete');
    if(action==='delete'&&deleteButton?.id==='tos-confirm-delete')deleteButton.textContent='Deleting…';
    const error=state.overlay.querySelector('#tos-job-action-error');error.hidden=true;
    try{
      const photoPaths=action==='delete'?(state.noteFiles||[]).map(f=>f.storage_path).filter(Boolean):[];
      const r=await client.rpc('manage_job',{target_company:state.ctx.companyId,target_job:state.job.id,job_action:action,next_stage:stage});
      if(r.error)throw r.error;if(r.data!==state.job.id)throw new Error('The job was not changed. Please refresh and try again.');
      let photoCleanupError=null;
      if(photoPaths.length){
        try{const cleanup=await client.storage.from('job-notes').remove(photoPaths);photoCleanupError=cleanup?.error||null;}
        catch(cleanupError){photoCleanupError=cleanupError;}
      }
      jobsCache=[];
      if(current===state){
        if(action==='delete')closeJob();
        else{state.job.status=['bill sent','bill paid'].includes(stage)?'complete':stage;state.job.billing_stage=['bill sent','bill paid'].includes(stage)?stage:null;renderJob();}
      }
      document.dispatchEvent(new CustomEvent('tradeos:jobs-changed'));
      toast(action==='delete'?(photoCleanupError?'Job deleted; some photo files still need cleanup':'Job deleted'):'Job stage updated');
    }catch(e){if(current===state){error.textContent=e.message||'Could not update the job.';error.hidden=false;error.scrollIntoView?.({block:'center'});}}
    finally{state.saving=false;buttons.forEach(b=>b.disabled=false);if(deleteButton?.id==='tos-confirm-delete')deleteButton.textContent='Delete everything';}
  }

  function notesSectionHtml(){
    const notes=current?.notes||[];
    return `<section class="tos-job-section tos-job-updates" id="tos-job-updates">
      <div class="tos-job-section-head"><div><span>UPDATES</span><h3>Notes & photos</h3></div><button type="button" class="tos-job-add-update">+ Add update</button></div>
      <div class="tos-job-update-form" hidden>
        <textarea class="tos-job-update-text" maxlength="4000" rows="4" placeholder="Add a site note, customer request, progress update or anything the team should know…"></textarea>
        <input class="tos-job-update-files" type="file" accept="image/*" multiple hidden>
        <div class="tos-job-update-tools"><button type="button" class="tos-job-pick-photos">📷 Add photos</button><span class="tos-job-selected-files">No photos selected</span></div>
        <div class="tos-job-update-error" hidden></div>
        <div class="tos-job-update-actions"><button type="button" class="tos-job-update-cancel">Cancel</button><button type="button" class="tos-job-update-save">Post update</button></div>
      </div>
      <div class="tos-job-update-list">${notes.length?notes.map(noteCard).join(''):`<div class="tos-job-empty"><strong>No updates yet</strong><p>Add site notes and photos here so everyone on the job has the same information.</p></div>`}</div>
    </section>`;
  }

  function noteCard(note){
    const member=current.members.find(m=>m.user_id===note.created_by);
    const files=current.noteFiles.filter(f=>f.note_id===note.id);
    const when=note.created_at?updateFmt.format(new Date(note.created_at)):'';
    return `<article class="tos-job-update-card">
      <div class="tos-job-update-meta"><div class="tos-job-update-avatar">${initials(member?.full_name||member?.role||'Team')}</div><div><strong>${esc(member?.full_name||'Team member')}</strong><span>${esc(when)}</span></div></div>
      ${note.body?`<p class="tos-job-update-body">${esc(note.body)}</p>`:''}
      ${files.length?`<div class="tos-job-update-photos">${files.map(photoTile).join('')}</div>`:''}
    </article>`;
  }

  function photoTile(file){
    const url=current.photoUrls?.[file.id];
    const label=file.file_name||'Job photo';
    return url
      ? `<div class="tos-job-update-photo"><img src="${esc(url)}" alt="${esc(label)}" loading="lazy"></div>`
      : `<div class="tos-job-update-photo tos-job-photo-placeholder"><span>PHOTO</span></div>`;
  }

  function bindNotesSection(section){
    if(!section)return;
    const form=section.querySelector('.tos-job-update-form');
    const text=section.querySelector('.tos-job-update-text');
    const files=section.querySelector('.tos-job-update-files');
    const selected=section.querySelector('.tos-job-selected-files');
    const error=section.querySelector('.tos-job-update-error');
    const add=section.querySelector('.tos-job-add-update');
    const cancel=section.querySelector('.tos-job-update-cancel');
    const pick=section.querySelector('.tos-job-pick-photos');
    const save=section.querySelector('.tos-job-update-save');
    const reset=()=>{
      form.hidden=true;text.value='';files.value='';selected.textContent='No photos selected';error.hidden=true;error.textContent='';add.hidden=false;
    };
    add?.addEventListener('click',()=>{form.hidden=false;add.hidden=true;requestAnimationFrame(()=>text.focus({preventScroll:true}));});
    cancel?.addEventListener('click',reset);
    pick?.addEventListener('click',()=>files.click());
    files?.addEventListener('change',()=>{
      const list=[...(files.files||[])];
      selected.textContent=!list.length?'No photos selected':list.length===1?list[0].name:`${list.length} photos selected`;
      if(list.length>MAX_PHOTOS){showUpdateError(error,`Choose up to ${MAX_PHOTOS} photos at a time.`);}else{error.hidden=true;error.textContent='';}
    });
    save?.addEventListener('click',()=>submitJobUpdate({form,text,files,error,save}));
  }

  async function submitJobUpdate({form,text,files,error,save}){
    if(!current)return;
    const body=String(text.value||'').trim();
    const chosen=[...(files.files||[])];
    if(!body&&!chosen.length){showUpdateError(error,'Add a note or at least one photo.');return;}
    if(chosen.length>MAX_PHOTOS){showUpdateError(error,`Choose up to ${MAX_PHOTOS} photos at a time.`);return;}
    const tooLarge=chosen.find(f=>Number(f.size||0)>MAX_PHOTO_BYTES);
    if(tooLarge){showUpdateError(error,`${tooLarge.name} is larger than 15 MB.`);return;}
    const notImage=chosen.find(f=>f.type&&!String(f.type).startsWith('image/'));
    if(notImage){showUpdateError(error,`${notImage.name} is not an image.`);return;}
    save.disabled=true;save.textContent=chosen.length?'Uploading…':'Saving…';error.hidden=true;error.textContent='';
    const state=current;
    let note=null;
    const uploaded=[];
    try{
      const nr=await client.from('job_notes').insert({company_id:state.ctx.companyId,job_id:state.job.id,created_by:state.ctx.user.id,body:body||null}).select('id,company_id,job_id,created_by,body,created_at,updated_at').single();
      if(nr.error)throw nr.error;
      note=nr.data;
      for(const file of chosen){
        const ext=fileExtension(file);
        const token=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path=`${state.ctx.companyId}/${state.job.id}/${note.id}/${state.ctx.user.id}/${token}.${ext}`;
        const ur=await client.storage.from('job-notes').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'application/octet-stream'});
        if(ur.error)throw ur.error;
        uploaded.push(path);
        const fr=await client.from('job_note_files').insert({company_id:state.ctx.companyId,job_id:state.job.id,note_id:note.id,created_by:state.ctx.user.id,storage_path:path,file_name:file.name||null,mime_type:file.type||null,size_bytes:Number(file.size)||null});
        if(fr.error)throw fr.error;
      }
      await refreshNotes(state);
      toast(chosen.length?'Update and photos added':'Update added');
    }catch(x){
      if(uploaded.length){try{await client.storage.from('job-notes').remove(uploaded);}catch(_){} }
      if(note?.id){try{await client.from('job_note_files').delete().eq('note_id',note.id);await client.from('job_notes').delete().eq('id',note.id);}catch(_){} }
      if(current===state&&form.isConnected){save.disabled=false;save.textContent='Post update';showUpdateError(error,x?.message||'Could not add this update.');}
    }
  }

  async function refreshNotes(state=current){
    if(!state||current!==state)return;
    const [nr,fr]=await Promise.all([
      client.from('job_notes').select('id,company_id,job_id,created_by,body,created_at,updated_at').eq('company_id',state.ctx.companyId).eq('job_id',state.job.id).order('created_at',{ascending:false}).limit(200),
      client.from('job_note_files').select('id,company_id,job_id,note_id,created_by,storage_path,file_name,mime_type,size_bytes,created_at').eq('company_id',state.ctx.companyId).eq('job_id',state.job.id).order('created_at',{ascending:true}).limit(600)
    ]);
    if(nr.error)throw nr.error;if(fr.error)throw fr.error;
    state.notes=nr.data||[];state.noteFiles=fr.data||[];
    await hydratePhotoUrls(state);
    if(current!==state||!state.overlay?.isConnected)return;
    renderNotesSection();
  }

  function renderNotesSection(){
    const old=current?.overlay?.querySelector('#tos-job-updates');
    if(!old)return;
    old.insertAdjacentHTML('afterend',notesSectionHtml());
    const fresh=old.nextElementSibling;
    old.remove();
    bindNotesSection(fresh);
  }

  function showUpdateError(el,message){if(!el)return;el.textContent=message;el.hidden=false;}
  function fileExtension(file){
    const fromName=String(file?.name||'').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);
    if(fromName&&fromName!==String(file?.name||'').toLowerCase())return fromName;
    const mime=String(file?.type||'').toLowerCase();
    if(mime.includes('png'))return'png';if(mime.includes('heic'))return'heic';if(mime.includes('heif'))return'heif';if(mime.includes('webp'))return'webp';
    return'jpg';
  }

  function personRow(m,entries){
    const personHours=sum(entries.filter(e=>e.user_id===m.user_id).map(e=>num(e.hours)));
    return `<div class="tos-job-person"><div class="tos-job-avatar">${initials(m.full_name||m.role)}</div><div><strong>${esc(m.full_name||pretty(m.role))}</strong><span>${esc(pretty(m.role))}</span></div><b>${hours(personHours)}</b></div>`;
  }

  function groupEntries(entries){
    const map=new Map();
    entries.forEach(e=>{if(!map.has(e.work_date))map.set(e.work_date,[]);map.get(e.work_date).push(e);});
    return [...map.entries()].map(([date,items])=>({date,items,total:sum(items.map(x=>num(x.hours)))}));
  }

  function dayGroup(g,members){
    const d=new Date(`${g.date}T12:00:00`);
    return `<div class="tos-job-day"><div class="tos-job-day-head"><strong>${esc(dateFmt.format(d))}</strong><span>${hours(g.total)}</span></div>${g.items.map(e=>entryRow(e,members)).join('')}</div>`;
  }

  function entryRow(e,members){
    const person=members.find(m=>m.user_id===e.user_id);
    const time=e.start_time&&e.end_time?`${hhmm(e.start_time)}–${hhmm(e.end_time)}`:'Time entry';
    const breakText=num(e.break_minutes)>0?` · ${num(e.break_minutes)}m break`:'';
    return `<div class="tos-job-time-entry"><div><strong>${esc(person?.full_name||'Team member')}</strong><span>${esc(time)}${breakText}</span>${e.notes?`<p>${esc(e.notes)}</p>`:''}</div><b>${hours(num(e.hours))}</b></div>`;
  }

  function openManageTeam(){
    if(!current)return;
    document.querySelector('.tos-job-team-sheet')?.remove();
    const {job,members,assignments}=current;
    const selected=new Set(assignments.map(a=>a.member_id));
    const o=document.createElement('div');o.className='tos-job-team-sheet';
    o.innerHTML=`<div class="tos-job-team-panel" role="dialog" aria-modal="true" aria-label="People on ${esc(job.title)}"><div class="tos-job-team-handle"></div><div class="tos-job-team-head"><div><span>PEOPLE ON JOB</span><h3>${esc(job.title)}</h3><p>Choose who can see and log time to this job.</p></div><button type="button" class="tos-job-team-close">×</button></div><div class="tos-job-team-options">${members.map(m=>`<label><input type="checkbox" value="${esc(m.id)}" ${selected.has(m.id)?'checked':''}><i>${initials(m.full_name||m.role)}</i><span><strong>${esc(m.full_name||pretty(m.role))}</strong><small>${esc(pretty(m.role))}</small></span><b></b></label>`).join('')}</div><div class="tos-job-team-error" hidden></div><button type="button" class="tos-job-team-save">Save people on ${esc(job.title)}</button></div>`;
    document.body.appendChild(o);document.body.classList.add('tos-job-team-open');
    const close=()=>{o.remove();document.body.classList.remove('tos-job-team-open');};
    o.querySelector('.tos-job-team-close')?.addEventListener('click',close);o.addEventListener('click',e=>{if(e.target===o)close();});
    o.querySelector('.tos-job-team-save')?.addEventListener('click',async e=>{
      const btn=e.currentTarget,err=o.querySelector('.tos-job-team-error');
      const next=new Set([...o.querySelectorAll('input:checked')].map(x=>x.value));
      const add=[...next].filter(x=>!selected.has(x));const remove=[...selected].filter(x=>!next.has(x));
      btn.disabled=true;btn.textContent='Saving…';err.hidden=true;
      try{
        if(add.length){const r=await client.from('job_assignments').upsert(add.map(member_id=>({company_id:current.ctx.companyId,job_id:job.id,member_id})),{onConflict:'job_id,member_id',ignoreDuplicates:true});if(r.error)throw r.error;}
        if(remove.length){const r=await client.from('job_assignments').delete().eq('company_id',current.ctx.companyId).eq('job_id',job.id).in('member_id',remove);if(r.error)throw r.error;}
        const ar=await client.from('job_assignments').select('id,job_id,member_id').eq('company_id',current.ctx.companyId).eq('job_id',job.id);if(ar.error)throw ar.error;
        current.assignments=ar.data||[];close();renderJob();toast('People updated');
      }catch(x){btn.disabled=false;btn.textContent=`Save people on ${job.title}`;err.textContent=x?.message||'Could not update this job.';err.hidden=false;}
    });
  }

  function closeJob(){document.querySelector('.tos-job-detail')?.remove();document.querySelector('.tos-job-team-sheet')?.remove();document.body.classList.remove('tos-job-detail-open','tos-job-team-open');current=null;}
  function toast(t){document.querySelector('.tos-job-toast')?.remove();const x=document.createElement('div');x.className='tos-job-toast';x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2200);}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function sum(a){return a.reduce((x,y)=>x+num(y),0);}
  function hours(v){const n=num(v);return `${Number.isInteger(n)?n:n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}h`;}
  function hhmm(v){return String(v||'').slice(0,5);}
  function pretty(v){return String(v||'').replace(/(^|[_-])(\w)/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}
  function initials(v){const p=String(v||'?').trim().split(/\s+/).filter(Boolean);return esc((p[0]?.[0]||'?')+(p.length>1?(p[p.length-1]?.[0]||''):''));}
  function formatSchedule(a,b){const start=new Date(a),end=b?new Date(b):null;const df=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});return end?`${df.format(start)} – ${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(end)}`:df.format(start);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.querySelector('.tos-job-team-sheet'))document.querySelector('.tos-job-team-sheet .tos-job-team-close')?.click();else if(document.querySelector('.tos-job-detail'))closeJob();}});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('tradeos:jobs-changed',()=>{jobsCache=[];contextCache=null;schedule();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
