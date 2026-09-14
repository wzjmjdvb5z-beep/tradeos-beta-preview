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
if(!process.env.PERF_BASELINE){assert.ok(idle<20,`Idle DOM kept changing: ${idle}`);await page.evaluate(()=>{window.originalButton=document.querySelector('[data-home-nav]');document.querySelector('.stats .stat strong').textContent='9';});await page.waitForTimeout(150);assert.ok((await page.locator('.tos-home-metrics').innerText()).includes('9'));await page.evaluate(()=>document.querySelector('[data-nav="finance"]').classList.add('active'));await page.waitForTimeout(100);assert.equal(await page.locator('.modern-more.active').count(),1);console.log('PASS: idle settles, live stats refresh and secondary navigation state updates.');}
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
