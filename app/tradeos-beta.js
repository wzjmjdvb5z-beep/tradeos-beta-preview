(() => {
  const STORAGE_KEY = 'tradeos_beta_workspace_v3';
  const ACTIVE_VIEW_KEY = 'tradeos_beta_active_view';
  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

  const seed = {
    jobs: [
      { id: uid(), title: 'Consumer unit upgrade', customer: 'Sarah Mitchell', address: '12 Oak Lane, Bristol', status: 'In progress' },
      { id: uid(), title: 'EV charger installation', customer: 'Priya Shah', address: '22 Elm Close, Bristol', status: 'Booked' },
      { id: uid(), title: 'Outdoor lighting', customer: 'James Carter', address: '8 Mill Road, Bath', status: 'Booked' },
    ],
    quotes: [],
    employees: [
      { id: 'emp-owner', name: 'Alex Turner', hourlyCost: 22.5 },
      { id: 'emp-sam', name: 'Sam Carter', hourlyCost: 18.5 },
    ],
    timesheets: {},
  };

  let state = load();
  let activeView = localStorage.getItem(ACTIVE_VIEW_KEY) || 'home';
  let activeEmployee = state.employees[0]?.id || 'emp-owner';
  let activeWeek = mondayIso(new Date());

  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="brand"><div class="logo">T</div><div><h1>Veystead</h1></div></div>
        <div class="beta-pill"><span class="beta-dot"></span> Founding beta</div>
      </header>
      <main id="main"></main>
      <nav class="bottom-nav">
        ${navButton('home','⌂','Home')}
        ${navButton('jobs','▣','Jobs')}
        ${navButton('quotes','£','Quotes')}
        ${navButton('timesheets','◷','Timesheets')}
      </nav>
      <div id="toast" class="toast"></div>
    </div>`;

  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  render();

  function navButton(view, icon, label) {
    return `<button class="nav-btn" data-view="${view}"><span class="icon">${icon}</span><span>${label}</span></button>`;
  }

  function setView(view) {
    activeView = view;
    localStorage.setItem(ACTIVE_VIEW_KEY, view);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === activeView));
    const main = document.getElementById('main');
    if (activeView === 'jobs') main.innerHTML = renderJobs();
    else if (activeView === 'quotes') main.innerHTML = renderQuotes();
    else if (activeView === 'timesheets') main.innerHTML = renderTimesheets();
    else main.innerHTML = renderHome();
    bindView();
  }

  function renderHome() {
    const week = getSheet(activeEmployee, activeWeek, false);
    const weekHours = week ? totalSheetHours(week) : 0;
    const openQuotes = state.quotes.filter(q => q.status !== 'Accepted');
    const openValue = openQuotes.reduce((sum, q) => sum + q.total, 0);
    return `
      <section class="hero">
        <div><p class="eyebrow">YOUR WORKSPACE</p><h2>Run the week, not the paperwork.</h2><p class="sub">Quotes, jobs and job-linked timesheets in one tester-ready workspace.</p></div>
        <button class="btn" data-jump="quotes">+ New quote</button>
      </section>
      <div class="notice">Beta data is stored on this device, so testers can safely create, change and submit sample records without affecting anyone else.</div>
      <section class="grid stats">
        ${stat('Live jobs', state.jobs.length)}
        ${stat('Open quotes', openQuotes.length)}
        ${stat('Quote pipeline', money.format(openValue))}
        ${stat('This week', `${formatHours(weekHours)} hrs`)}
      </section>
      <section class="card section-card">
        <div class="section-head"><div><h3>Jobs</h3><p>Work available for quote conversion and timesheet allocation.</p></div><button class="btn secondary small" data-jump="jobs">View all</button></div>
        ${state.jobs.length ? `<div class="list">${state.jobs.slice(0,4).map(jobItem).join('')}</div>` : empty('No jobs yet. Convert a quote or add one manually.')}
      </section>
      <section class="card section-card">
        <div class="section-head"><div><h3>Recent quotes</h3><p>Live pricing with labour, materials, VAT and conversion to jobs.</p></div><button class="btn secondary small" data-jump="quotes">Open quotes</button></div>
        ${state.quotes.length ? `<div class="list">${state.quotes.slice(0,4).map(quoteItem).join('')}</div>` : empty('Create your first interactive quote to test the workflow.')}
      </section>`;
  }

  function renderJobs() {
    return `
      <section class="hero"><div><p class="eyebrow">JOBS</p><h2>Every job in one place.</h2><p class="sub">Add work directly or convert an accepted quote into a job.</p></div></section>
      <section class="card section-card">
        <div class="section-head"><div><h3>Add a job</h3><p>Useful for testing timesheets against real job names.</p></div></div>
        <form id="job-form" class="form-grid">
          <div class="field"><label>Job title</label><input name="title" required placeholder="e.g. Kitchen rewire" /></div>
          <div class="field"><label>Customer</label><input name="customer" placeholder="Customer name" /></div>
          <div class="field full"><label>Site address</label><input name="address" placeholder="Job address" /></div>
          <div class="field"><label>Status</label><select name="status"><option>Booked</option><option>In progress</option><option>Complete</option></select></div>
          <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">Add job</button></div>
        </form>
      </section>
      <section class="card section-card">
        <div class="section-head"><div><h3>${state.jobs.length} jobs</h3><p>These jobs appear in the weekly timesheet dropdown.</p></div></div>
        ${state.jobs.length ? `<div class="list">${state.jobs.map(jobItemEditable).join('')}</div>` : empty('No jobs yet.')}
      </section>`;
  }

  function renderQuotes() {
    return `
      <section class="hero"><div><p class="eyebrow">QUOTES</p><h2>Build a quote in seconds.</h2><p class="sub">Change the inputs and the customer total updates instantly.</p></div></section>
      <div class="quote-layout">
        <section class="card section-card">
          <div class="section-head"><div><h3>Quote builder</h3><p>Create a genuine interactive quote for a tester.</p></div></div>
          <form id="quote-form" class="form-grid">
            <div class="field"><label>Customer name</label><input name="customer" required placeholder="Sarah Mitchell" /></div>
            <div class="field"><label>Job title</label><input name="title" required placeholder="Consumer unit upgrade" /></div>
            <div class="field full"><label>Site address</label><input name="address" placeholder="12 Oak Lane, Bristol" /></div>
            <div class="field full"><label>Work description</label><textarea name="description" placeholder="Describe the work included in the quote"></textarea></div>
            <div class="field"><label>Labour hours</label><input class="quote-calc" name="labourHours" type="number" min="0" step="0.25" value="6" /></div>
            <div class="field"><label>Hourly rate (£)</label><input class="quote-calc" name="hourlyRate" type="number" min="0" step="0.01" value="45" /></div>
            <div class="field"><label>Materials (£)</label><input class="quote-calc" name="materials" type="number" min="0" step="0.01" value="320" /></div>
            <div class="field"><label>Callout fee (£)</label><input class="quote-calc" name="callout" type="number" min="0" step="0.01" value="60" /></div>
            <div class="field"><label>VAT rate (%)</label><input class="quote-calc" name="vatRate" type="number" min="0" step="1" value="20" /></div>
            <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">Save quote</button></div>
          </form>
        </section>
        <aside class="card quote-total">
          <p class="eyebrow">LIVE TOTAL</p>
          <div class="money-row"><span>Labour</span><strong id="calc-labour">£0.00</strong></div>
          <div class="money-row"><span>Materials</span><strong id="calc-materials">£0.00</strong></div>
          <div class="money-row"><span>Callout</span><strong id="calc-callout">£0.00</strong></div>
          <div class="money-row"><span>Subtotal</span><strong id="calc-subtotal">£0.00</strong></div>
          <div class="money-row"><span>VAT</span><strong id="calc-vat">£0.00</strong></div>
          <div class="money-row total"><span>Total</span><strong id="calc-total">£0.00</strong></div>
          <p class="sub" style="font-size:12px">Saved quotes can be converted straight into a job, then that job immediately becomes available in timesheets.</p>
        </aside>
      </div>
      <section class="card section-card" style="margin-top:16px">
        <div class="section-head"><div><h3>Saved quotes</h3><p>Convert any draft quote into a live job.</p></div></div>
        ${state.quotes.length ? `<div class="list">${state.quotes.map(quoteItemFull).join('')}</div>` : empty('No quotes saved yet.')}
      </section>`;
  }

  function renderTimesheets() {
    const employee = state.employees.find(e => e.id === activeEmployee) || state.employees[0];
    if (!employee) return empty('Add an employee to use timesheets.');
    const sheet = getSheet(employee.id, activeWeek, true);
    const dates = weekDates(activeWeek);
    const locked = sheet.status === 'Submitted';
    const dayTotals = Array.from({length:7}, (_, day) => sum(sheet.rows.map(r => num(r.hours[day]))));
    const weekTotal = sum(dayTotals);
    const cost = weekTotal * num(employee.hourlyCost);
    const jobBreakdown = timesheetJobBreakdown(sheet);

    return `
      <section class="hero"><div><p class="eyebrow">WEEKLY TIMESHEET</p><h2>Hours linked to the right job.</h2><p class="sub">Allocate each row to a specific job, enter Mon–Sun hours and submit the week.</p></div></section>
      <div class="notice">Each employee and week has its own saved timesheet. Submitted weeks are locked until reopened, so testers can experience a proper draft → submit flow.</div>
      <section class="card section-card">
        <div class="week-toolbar">
          <div class="employee-box">
            <label for="employee-select">Employee</label>
            <select id="employee-select">${state.employees.map(e => `<option value="${e.id}" ${e.id===employee.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>
            <button class="btn secondary small" id="add-employee">+ Employee</button>
          </div>
          <div class="week-switch">
            <button class="btn secondary small" id="prev-week">‹</button>
            <div class="week-label">${shortDate.format(dates[0])} – ${shortDate.format(dates[6])}</div>
            <button class="btn secondary small" id="next-week">›</button>
          </div>
        </div>
        <div class="section-head"><div><h3>${esc(employee.name)}</h3><p>${sheet.status} · Cost rate ${money.format(employee.hourlyCost)}/hr</p></div><span class="status ${sheet.status.toLowerCase()}">${sheet.status}</span></div>
        ${state.jobs.length ? `
          <div class="timesheet-wrap">
            <table>
              <thead><tr><th class="job-col">Job</th>${dates.map(d=>`<th>${dayName(d)}<br>${d.getDate()}</th>`).join('')}<th>Total</th><th></th></tr></thead>
              <tbody>
                ${sheet.rows.map((row, idx) => timesheetRow(row, idx, locked)).join('')}
              </tbody>
              <tfoot><tr><td class="job-col">Daily total</td>${dayTotals.map(v=>`<td>${formatHours(v)}</td>`).join('')}<td class="row-total">${formatHours(weekTotal)}</td><td></td></tr></tfoot>
            </table>
          </div>
          <div class="actions">
            <button class="btn secondary" id="add-row" ${locked?'disabled':''}>+ Add job row</button>
            ${locked ? `<button class="btn secondary" id="reopen-sheet">Reopen week</button>` : `<button class="btn" id="submit-sheet" ${weekTotal<=0?'disabled':''}>Submit week</button>`}
          </div>
          <div class="grid stats" style="margin:18px 0 0">
            ${stat('Weekly hours', formatHours(weekTotal))}
            ${stat('Labour cost', money.format(cost))}
            ${stat('Jobs used', jobBreakdown.length)}
            ${stat('Status', sheet.status)}
          </div>
          <div class="section-head" style="margin-top:18px"><div><h3>Hours by job</h3><p>Useful for job costing and profitability.</p></div></div>
          <div class="job-summary">${jobBreakdown.length ? jobBreakdown.map(x => `<div class="job-chip"><small>${esc(x.title)}</small><strong>${formatHours(x.hours)} hrs</strong></div>`).join('') : `<div class="empty">Enter hours to see job allocation.</div>`}</div>
        ` : empty('Add at least one job first. Every timesheet row must be allocated to a job.')}
      </section>`;
  }

  function timesheetRow(row, rowIndex, locked) {
    return `<tr>
      <td class="job-col"><select data-row-job="${rowIndex}" ${locked?'disabled':''}>${state.jobs.map(j => `<option value="${j.id}" ${j.id===row.jobId?'selected':''}>${esc(j.title)}${j.customer ? ` — ${esc(j.customer)}` : ''}</option>`).join('')}</select></td>
      ${row.hours.map((h, dayIndex) => `<td><input class="hours" type="number" min="0" max="24" step="0.25" value="${num(h) || ''}" data-hours-row="${rowIndex}" data-hours-day="${dayIndex}" ${locked?'disabled':''}></td>`).join('')}
      <td class="row-total">${formatHours(sum(row.hours.map(num)))}</td>
      <td><button class="delete-row" title="Remove row" data-delete-row="${rowIndex}" ${locked?'disabled':''}>×</button></td>
    </tr>`;
  }

  function stat(label, value) { return `<div class="card stat"><span>${esc(String(label))}</span><strong>${esc(String(value))}</strong></div>`; }
  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }

  function jobItem(job) {
    return `<div class="list-item"><div class="list-main"><strong>${esc(job.title)}</strong><small>${esc(job.customer || 'No customer')} · ${esc(job.address || 'No address')}</small></div><div class="list-side"><span class="status">${esc(job.status)}</span></div></div>`;
  }

  function jobItemEditable(job) {
    return `<div class="list-item"><div class="list-main"><strong>${esc(job.title)}</strong><small>${esc(job.customer || 'No customer')} · ${esc(job.address || 'No address')}</small></div><div class="list-side"><select class="job-status" data-job-status="${job.id}"><option ${job.status==='Booked'?'selected':''}>Booked</option><option ${job.status==='In progress'?'selected':''}>In progress</option><option ${job.status==='Complete'?'selected':''}>Complete</option></select></div></div>`;
  }

  function quoteItem(q) {
    return `<div class="list-item"><div class="list-main"><strong>${esc(q.title)}</strong><small>${esc(q.customer)} · ${esc(q.address || 'No address')}</small></div><div class="list-side"><span class="amount">${money.format(q.total)}</span><span class="status ${q.status.toLowerCase()}">${esc(q.status)}</span></div></div>`;
  }

  function quoteItemFull(q) {
    return `<div class="list-item"><div class="list-main"><strong>${esc(q.title)}</strong><small>${esc(q.customer)} · Labour ${formatHours(q.labourHours)}h @ ${money.format(q.hourlyRate)} · Materials ${money.format(q.materials)}</small></div><div class="list-side"><span class="amount">${money.format(q.total)}</span><span class="status ${q.status.toLowerCase()}">${esc(q.status)}</span>${q.status!=='Accepted'?`<button class="btn small" data-convert-quote="${q.id}">Convert to job</button>`:''}</div></div>`;
  }

  function bindView() {
    document.querySelectorAll('[data-jump]').forEach(el => el.addEventListener('click', () => setView(el.dataset.jump)));

    const jobForm = document.getElementById('job-form');
    if (jobForm) jobForm.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(jobForm);
      const title = String(fd.get('title') || '').trim();
      if (!title) return;
      state.jobs.unshift({ id: uid(), title, customer: String(fd.get('customer')||'').trim(), address: String(fd.get('address')||'').trim(), status: String(fd.get('status')||'Booked') });
      save(); toast('Job added'); render();
    });

    document.querySelectorAll('[data-job-status]').forEach(el => el.addEventListener('change', () => {
      const job = state.jobs.find(j => j.id === el.dataset.jobStatus);
      if (job) { job.status = el.value; save(); toast('Job updated'); }
    }));

    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
      quoteForm.querySelectorAll('.quote-calc').forEach(el => el.addEventListener('input', updateQuoteCalc));
      quoteForm.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(quoteForm);
        const customer = String(fd.get('customer')||'').trim();
        const title = String(fd.get('title')||'').trim();
        if (!customer || !title) return toast('Add a customer and job title');
        const calc = quoteCalculation(fd);
        state.quotes.unshift({
          id: uid(), customer, title, address: String(fd.get('address')||'').trim(), description: String(fd.get('description')||'').trim(),
          labourHours: calc.labourHours, hourlyRate: calc.hourlyRate, materials: calc.materials, callout: calc.callout, vatRate: calc.vatRate,
          subtotal: calc.subtotal, vat: calc.vat, total: calc.total, status: 'Draft', createdAt: new Date().toISOString()
        });
        save(); toast('Quote saved'); render();
      });
      updateQuoteCalc();
    }

    document.querySelectorAll('[data-convert-quote]').forEach(el => el.addEventListener('click', () => {
      const q = state.quotes.find(x => x.id === el.dataset.convertQuote);
      if (!q || q.status === 'Accepted') return;
      q.status = 'Accepted';
      state.jobs.unshift({ id: uid(), title: q.title, customer: q.customer, address: q.address, status: 'Booked', quoteId: q.id });
      save(); toast('Quote converted to job'); render();
    }));

    const employeeSelect = document.getElementById('employee-select');
    if (employeeSelect) employeeSelect.addEventListener('change', () => { activeEmployee = employeeSelect.value; render(); });
    const addEmployee = document.getElementById('add-employee');
    if (addEmployee) addEmployee.addEventListener('click', () => {
      const name = prompt('Employee name');
      if (!name?.trim()) return;
      const rateRaw = prompt('Hourly employment cost (£)', '20');
      const hourlyCost = Math.max(0, num(rateRaw));
      const employee = { id: uid(), name: name.trim(), hourlyCost };
      state.employees.push(employee); activeEmployee = employee.id; save(); toast('Employee added'); render();
    });
    const prevWeek = document.getElementById('prev-week');
    if (prevWeek) prevWeek.addEventListener('click', () => { activeWeek = addDaysIso(activeWeek, -7); render(); });
    const nextWeek = document.getElementById('next-week');
    if (nextWeek) nextWeek.addEventListener('click', () => { activeWeek = addDaysIso(activeWeek, 7); render(); });

    document.querySelectorAll('[data-row-job]').forEach(el => el.addEventListener('change', () => {
      const sheet = getSheet(activeEmployee, activeWeek, true); const row = sheet.rows[num(el.dataset.rowJob)];
      if (row) { row.jobId = el.value; save(); render(); }
    }));
    document.querySelectorAll('[data-hours-row]').forEach(el => el.addEventListener('change', () => {
      const sheet = getSheet(activeEmployee, activeWeek, true);
      const r = num(el.dataset.hoursRow), d = num(el.dataset.hoursDay);
      const value = Math.min(24, Math.max(0, num(el.value)));
      if (sheet.rows[r]) { sheet.rows[r].hours[d] = value; save(); render(); }
    }));
    document.querySelectorAll('[data-delete-row]').forEach(el => el.addEventListener('click', () => {
      const sheet = getSheet(activeEmployee, activeWeek, true);
      if (sheet.rows.length <= 1) { sheet.rows[0].hours = [0,0,0,0,0,0,0]; save(); render(); return; }
      sheet.rows.splice(num(el.dataset.deleteRow), 1); save(); render();
    }));
    const addRow = document.getElementById('add-row');
    if (addRow) addRow.addEventListener('click', () => {
      const sheet = getSheet(activeEmployee, activeWeek, true);
      sheet.rows.push(newTimesheetRow(state.jobs[Math.min(sheet.rows.length, state.jobs.length - 1)]?.id)); save(); render();
    });
    const submitSheet = document.getElementById('submit-sheet');
    if (submitSheet) submitSheet.addEventListener('click', () => {
      const sheet = getSheet(activeEmployee, activeWeek, true);
      if (totalSheetHours(sheet) <= 0) return toast('Enter some hours first');
      sheet.status = 'Submitted'; sheet.submittedAt = new Date().toISOString(); save(); toast('Week submitted'); render();
    });
    const reopen = document.getElementById('reopen-sheet');
    if (reopen) reopen.addEventListener('click', () => {
      const sheet = getSheet(activeEmployee, activeWeek, true); sheet.status = 'Draft'; delete sheet.submittedAt; save(); toast('Week reopened'); render();
    });
  }

  function updateQuoteCalc() {
    const form = document.getElementById('quote-form'); if (!form) return;
    const calc = quoteCalculation(new FormData(form));
    setText('calc-labour', money.format(calc.labour));
    setText('calc-materials', money.format(calc.materials));
    setText('calc-callout', money.format(calc.callout));
    setText('calc-subtotal', money.format(calc.subtotal));
    setText('calc-vat', money.format(calc.vat));
    setText('calc-total', money.format(calc.total));
  }

  function quoteCalculation(fd) {
    const labourHours = Math.max(0, num(fd.get('labourHours')));
    const hourlyRate = Math.max(0, num(fd.get('hourlyRate')));
    const materials = Math.max(0, num(fd.get('materials')));
    const callout = Math.max(0, num(fd.get('callout')));
    const vatRate = Math.max(0, num(fd.get('vatRate')));
    const labour = round(labourHours * hourlyRate);
    const subtotal = round(labour + materials + callout);
    const vat = round(subtotal * vatRate / 100);
    const total = round(subtotal + vat);
    return { labourHours, hourlyRate, materials, callout, vatRate, labour, subtotal, vat, total };
  }

  function getSheet(employeeId, weekIso, create) {
    const key = `${employeeId}_${weekIso}`;
    if (!state.timesheets[key] && create) state.timesheets[key] = { employeeId, weekIso, status: 'Draft', rows: [newTimesheetRow(state.jobs[0]?.id)] };
    return state.timesheets[key] || null;
  }

  function newTimesheetRow(jobId) { return { id: uid(), jobId: jobId || '', hours: [0,0,0,0,0,0,0] }; }
  function totalSheetHours(sheet) { return sum(sheet.rows.flatMap(r => r.hours.map(num))); }
  function timesheetJobBreakdown(sheet) {
    const map = new Map();
    sheet.rows.forEach(row => {
      const job = state.jobs.find(j => j.id === row.jobId); if (!job) return;
      map.set(job.id, { title: job.title, hours: (map.get(job.id)?.hours || 0) + sum(row.hours.map(num)) });
    });
    return [...map.values()].filter(x => x.hours > 0).sort((a,b)=>b.hours-a.hours);
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || !Array.isArray(parsed.jobs) || !Array.isArray(parsed.employees)) return structuredCloneSafe(seed);
      parsed.quotes ||= []; parsed.timesheets ||= {}; return parsed;
    } catch { return structuredCloneSafe(seed); }
  }
  function structuredCloneSafe(obj) { return JSON.parse(JSON.stringify(obj)); }
  function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function sum(values) { return values.reduce((a,b)=>a+b,0); }
  function round(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function formatHours(n) { const v = round(num(n)); return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/,'').replace(/\.$/,''); }
  function setText(id, text) { const el=document.getElementById(id); if(el) el.textContent=text; }
  function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function toast(message) { const el=document.getElementById('toast'); if(!el)return; el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),1800); }
  function mondayIso(date) { const d=new Date(date); d.setHours(12,0,0,0); const day=d.getDay()||7; d.setDate(d.getDate()-day+1); return localIso(d); }
  function localIso(date) { const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
  function parseLocalIso(iso) { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d,12,0,0,0); }
  function addDaysIso(iso, days) { const d=parseLocalIso(iso); d.setDate(d.getDate()+days); return localIso(d); }
  function weekDates(iso) { const monday=parseLocalIso(iso); return Array.from({length:7},(_,i)=>{const d=new Date(monday); d.setDate(monday.getDate()+i); return d;}); }
  function dayName(date) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]; }
})();
