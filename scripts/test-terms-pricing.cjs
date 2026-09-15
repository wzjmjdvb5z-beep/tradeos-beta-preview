const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const onboarding=read('app/team-onboarding-v1.js');
const account=read('app/account-privacy-v1.js');
const index=read('app/index.html');
const terms=read('terms.html');

assert.match(onboarding,/£7\.99\/month for each additional active employee/);
assert.match(onboarding,/£19\/month Veystead plan includes the owner/);
assert.match(onboarding,/Subscriptions renew automatically each month until cancelled/);
assert.match(onboarding,/href="\.\.\/terms\.html"/);
assert.match(account,/data-legal-page="terms" href="\.\.\/terms\.html"/);
assert.match(account,/openExternal\(`https:\/\/veystead\.com\/\$\{page\}\.html`\)/);
assert.match(index,/team-onboarding-v1\.js\?v=veystead-pricing-terms-1/);
assert.match(terms,/£19 per month includes one owner/);
assert.match(terms,/£7\.99 per month for each additional active employee or user/);
assert.match(terms,/subscription renews automatically each month/);
assert.match(terms,/Cancel subscription/);
assert.match(terms,/privacy\.html/);

console.log('PASS: employee pricing, renewal, cancellation and legal links are clearly disclosed.');
