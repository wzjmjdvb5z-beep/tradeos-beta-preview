const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage();
await page.setContent(`<body><span class="beta">owner</span><nav class="bottom-nav">${['home','timesheets','jobs','quotes','finance','team','schedule'].map(n=>`<button data-nav="${n}" class="nav ${n==='home'?'active':''}"><b></b><span>${n}</span></button>`).join('')}</nav><main class="wrap"><section class="hero"><h2>Home</h2><p class="sub">Overview</p></section><section class="stats"><div class="stat"><span>Live jobs</span><strong>4</strong></div><div class="stat"><span>Outstanding</span><strong>£100</strong></div></section></main></body>`);
await page.evaluate(()=>{window.changes=0;new MutationObserver(m=>window.changes+=m.length).observe(document.documentElement,{subtree:true,childList:true,attributes:true});});
for(const f of ['modern-ui.js','product-v2.js','home-simple.js','product-clean-v1.js'])await page.addScriptTag({content:fs.readFileSync(path.join(process.env.PERF_SOURCE||'app',f),'utf8')});
await page.waitForTimeout(500);await page.evaluate(()=>window.changes=0);await page.waitForTimeout(1000);
const idle=await page.evaluate(()=>window.changes);console.log(JSON.stringify({idleMutationsPerSecond:idle}));
if(!process.env.PERF_BASELINE){assert.ok(idle<20,`Idle DOM kept changing: ${idle}`);await page.evaluate(()=>{window.originalButton=document.querySelector('[data-home-nav]');document.querySelector('.stats .stat strong').textContent='9';});await page.waitForTimeout(150);assert.ok((await page.locator('.tos-home-metrics').innerText()).includes('9'));await page.evaluate(()=>document.querySelector('[data-nav="finance"]').classList.add('active'));await page.waitForTimeout(100);assert.equal(await page.locator('.modern-more.active').count(),1);console.log('PASS: idle settles, live stats refresh and secondary navigation state updates.');
const mobile=await browser.newPage({viewport:{width:390,height:844}});
await mobile.setContent(`<div class="tos-schedule-sheet"><div class="tos-schedule-panel"><div class="tos-sheet-handle"></div><h3>Schedule job</h3><p class="sub">Kitchen rewire · Oakfield Renovation</p><div class="tos-schedule-form"><div class="tos-schedule-field full"><label>Date</label><input type="date" value="2026-09-18"></div><div class="tos-schedule-field"><label>Start time</label><input type="time" value="08:00"></div><div class="tos-schedule-field"><label>Finish time</label><input type="time" value="09:00"></div><div class="tos-schedule-field full"><label>Assign team</label><div class="tos-member-picks"><label class="tos-member-pick"><input type="checkbox" checked><span>Ben Churchill · owner</span></label></div></div></div><div class="tos-sheet-actions"><button class="tos-sheet-cancel">Cancel</button><button class="tos-sheet-save">Save schedule</button></div></div></div>`);
for(const f of ['../cloud/app.css','schedule-board.css','product-v3.css'])await mobile.addStyleTag({content:fs.readFileSync(path.join('app',f),'utf8')});
const scheduleSheet=await mobile.evaluate(()=>{const panel=document.querySelector('.tos-schedule-panel'),input=document.querySelector('.tos-schedule-field input'),heading=document.querySelector('.tos-schedule-panel h3'),r=panel.getBoundingClientRect(),ir=input.getBoundingClientRect();return{viewport:innerWidth,left:r.left,right:r.right,inputRight:ir.right,background:getComputedStyle(panel).backgroundColor,heading:getComputedStyle(heading).color,save:getComputedStyle(document.querySelector('.tos-sheet-save')).color};});
assert.ok(scheduleSheet.left>=-0.5&&scheduleSheet.right<=scheduleSheet.viewport+0.5,`Schedule sheet overflows viewport: ${JSON.stringify(scheduleSheet)}`);
assert.ok(scheduleSheet.inputRight<=scheduleSheet.viewport+0.5,`Schedule input overflows viewport: ${JSON.stringify(scheduleSheet)}`);
assert.equal(scheduleSheet.background,'rgb(255, 255, 255)');
assert.equal(scheduleSheet.heading,'rgb(23, 32, 51)');
assert.equal(scheduleSheet.save,'rgb(255, 255, 255)');
await mobile.close();
console.log('PASS: schedule sheet fits a 390px iPhone viewport with readable light-theme colours.');}
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
