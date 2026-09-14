const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/product-clean-v1.js','utf8').replace("  document.addEventListener('keydown'", "  globalThis.api={actionCard};\n  document.addEventListener('keydown'");
const ctx={document:{createElement:()=>({}),addEventListener(){},documentElement:{},readyState:'loading'},MutationObserver:class{observe(){}}};
vm.runInNewContext(src,ctx);
const card=ctx.api.actionCard({title:'<Job>',detail:'A & B',action:'Open',icon:'>'});
assert.ok(card.innerHTML.includes('&lt;Job&gt;'));assert.ok(card.innerHTML.includes('A &amp; B'));
console.log('PASS: action cards render with scoped escaping and no missing esc error.');
