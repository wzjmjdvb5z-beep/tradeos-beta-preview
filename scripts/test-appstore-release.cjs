const assert = require('node:assert/strict');
const fs = require('node:fs');

const customerFacingFiles = [
  'app/index.html',
  'app/tradeos-cloud-static.js',
  'app/beta-readiness.js',
  'cloud/app-v2.js',
  'index.html',
  'account.html',
  'feedback.html',
  'privacy.html',
  'support.html',
  'terms.html',
  'beta-local.js'
];

const forbiddenPresentation = /veystead cloud beta|cloud beta|founding beta|veystead beta|beta feedback|beta issues|testflight pending apple|tradeos_uk@proton\.me/i;

for (const file of customerFacingFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, forbiddenPresentation, `${file} contains pre-release or legacy support wording`);
}

const app = fs.readFileSync('app/tradeos-cloud-static.js', 'utf8');
assert.match(app, />VEYSTEAD</, 'The sign-in screen must retain the Veystead identity');
assert.match(app, /cloud workspace/, 'The signed-in role badge must describe the production workspace');

const feedback = fs.readFileSync('app/beta-readiness.js', 'utf8');
assert.match(feedback, /PRODUCT FEEDBACK/, 'The in-app feedback surface must use production wording');
assert.match(feedback, /Welcome to Veystead/, 'The onboarding surface must use production wording');

const privacy = fs.readFileSync('privacy.html', 'utf8');
const support = fs.readFileSync('support.html', 'utf8');
assert.match(privacy, /veystead@proton\.me/, 'The privacy contact must use the Veystead support address');
assert.match(support, /mailto:veystead@proton\.me/, 'The support page must provide the working Veystead email route');

const accountPrivacy = fs.readFileSync('app/account-privacy-v1.js', 'utf8');
assert.match(accountPrivacy, /request_account_deletion/, 'In-app account deletion must remain available');

const native = fs.readFileSync('mobile/native-entry.js', 'utf8');
assert.match(native, /buy\.stripe\.com/, 'The native purchase-link guard must remain in place');
assert.match(native, /data-tradeos-billing/, 'The native billing controls must remain hidden');

const capacitor = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
assert.equal(capacitor.appName, 'Veystead', 'The iOS display name must remain Veystead');

const packager = fs.readFileSync('scripts/prepare-mobile.mjs', 'utf8');
assert.match(packager, /app\/_expo/, 'The retired Expo prototype must be excluded from the iOS bundle');
assert.match(packager, /app\/tradeos-beta\.js/, 'The retired local prototype must be excluded from the iOS bundle');
assert.match(packager, /cloud\/app\.js/, 'The retired cloud prototype must be excluded from the iOS bundle');

console.log('App Store release wording and safeguards verified.');
