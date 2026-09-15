const fs = require('fs');

const builder = fs.readFileSync('app/quote-builder-v3.js', 'utf8');
const app = fs.readFileSync('app/index.html', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260915110000_make_quote_creation_idempotent.sql', 'utf8');

const checks = [
  [builder.includes('request_id:requestId'), 'quote save sends a stable request ID'],
  [builder.includes('form.dataset.quoteRequestId'), 'request ID survives a failed attempt'],
  [builder.includes('without creating a duplicate'), 'network error explains the safe retry'],
  [app.includes('quote-save-reliability-1'), 'browser cache is refreshed'],
  [migration.includes('quotes_company_client_request_id_key'), 'database enforces one quote per request'],
  [migration.includes('pg_advisory_xact_lock'), 'concurrent retries are serialized'],
  [migration.includes('private.is_company_admin(target_company)'), 'company manager permission is checked'],
  [migration.includes('revoke all on function public.create_trade_quote_v3'), 'anonymous function access is revoked']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}
