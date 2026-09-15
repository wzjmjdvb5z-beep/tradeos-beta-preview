const assert=require('node:assert/strict');
const fs=require('node:fs');

const ui=fs.readFileSync('app/billing-v1.js','utf8');
const migration=fs.readFileSync('scripts/veystead-pricing.sql','utf8');
const checkout=fs.readFileSync('supabase/functions/create-billing-checkout/index.ts','utf8');

assert.match(ui,/price_pence\|\|1900/);
assert.match(ui,/seat_price_pence\|\|799/);
assert.match(ui,/month includes the owner, then £\$\{seatPrice\} for each additional active user/);
assert.match(ui,/get_company_billing_v2/);
assert.match(ui,/data-billing-cancel/);
assert.match(ui,/updateSubscription\(ctx\.companyId,'cancel'\)/);
assert.match(ui,/data-billing-resume/);
assert.doesNotMatch(ui,/FOUNDING50|No per-user charge|TRADEOS PLAN/);
assert.match(migration,/greatest\(0, s\.active_users - 1\)/);
assert.match(migration,/b\.price_pence \+ greatest\(0, s\.active_users - 1\) \* b\.seat_price_pence/);
assert.match(migration,/b\.stripe_subscription_id is not null/);
assert.match(checkout,/line_items\[1\]\[quantity\]/);
assert.match(checkout,/subscription_data\[trial_end\]/);
assert.doesNotMatch(checkout,/subscription_data\[trial_period_days\]/);
assert.match(checkout,/req\.method === "OPTIONS"/);
assert.match(checkout,/action === "status"/);
assert.match(checkout,/action === "cancel"/);
assert.match(checkout,/cancel_at_period_end/);
assert.match(checkout,/stripeKeyFor\(livemode\)/);
assert.match(checkout,/2026-07-29\.dahlia/);
assert.doesNotMatch(checkout,/body\.(?:price|quantity|total|seat)/);

console.log('PASS: Veystead pricing is server-counted and checkout uses £19 base plus active seats.');
