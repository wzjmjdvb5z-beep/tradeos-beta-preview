const fs=require('node:fs');
const assert=require('node:assert/strict');

const commercial=fs.readFileSync('app/commercial-v1.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260915093000_add_delete_quote.sql','utf8');
const invoice=fs.readFileSync('invoice/index.html','utf8');
const quote=fs.readFileSync('quote/index.html','utf8');
const share=fs.readFileSync('app/customer-share-v1.js','utf8');

assert.match(commercial,/data-sheet-delete>Delete quote/);
assert.match(commercial,/rpc\('delete_quote'/);
assert.match(commercial,/The linked job will stay in Veystead/);
assert.match(migration,/private\.is_company_admin\(target_company\)/);
assert.match(migration,/update public\.jobs\s+set quote_id = null/s);
assert.match(migration,/delete from public\.quotes/);
assert.match(migration,/revoke all on function public\.delete_quote\(uuid, uuid\) from anon/);
assert.match(migration,/grant execute on function public\.delete_quote\(uuid, uuid\) to authenticated/);
assert.doesNotMatch(invoice,/TradeOS/);
assert.doesNotMatch(quote,/TradeOS/);
assert.match(invoice,/powered by Veystead/);
assert.match(quote,/powered by Veystead/);
assert.match(share,/PUBLIC_WEB_BASE='https:\/\/veystead\.com'/);

console.log('PASS: quote deletion keeps linked jobs, is manager-gated, and customer documents use Veystead.');
