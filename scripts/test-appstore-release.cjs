const assert = require('node:assert/strict');
const fs = require('node:fs');

const customerFacingFiles = [
  'app/index.html',
  'app/tradeos-cloud-static.js',
  'app/beta-readiness.js',
  'app/account-privacy-v1.js',
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
assert.doesNotMatch(app, /Unnamed member/, 'Incomplete team profiles must use a clear pending-state label');

const feedback = fs.readFileSync('app/beta-readiness.js', 'utf8');
assert.match(feedback, /PRODUCT FEEDBACK/, 'The in-app feedback surface must use production wording');
assert.match(feedback, /Welcome to Veystead/, 'The onboarding surface must use production wording');

const privacy = fs.readFileSync('privacy.html', 'utf8');
const support = fs.readFileSync('support.html', 'utf8');
assert.match(privacy, /veystead@proton\.me/, 'The privacy contact must use the Veystead support address');
assert.match(support, /mailto:veystead@proton\.me/, 'The support page must provide the working Veystead email route');

const accountPrivacy = fs.readFileSync('app/account-privacy-v1.js', 'utf8');
assert.match(accountPrivacy, /request_account_deletion/, 'In-app account deletion must remain available');
const appIndex = fs.readFileSync('app/index.html', 'utf8');
assert.match(appIndex, /<script src="\.\/account-privacy-v1\.js[^>]*defer><\/script>/, 'The account deletion feature must be loaded by the release app');
assert.match(appIndex, /tradeos-cloud-static\.js\?v=app-review-42/, 'The production wording bundle must use a fresh cache version');
assert.match(appIndex, /beta-readiness\.js\?v=app-review-42/, 'The production onboarding bundle must use a fresh cache version');
assert.match(appIndex, /schedule-board\.js\?v=app-review-43/, 'The corrected schedule bundle must use a fresh cache version');
assert.match(appIndex, /team-rates\.js\?v=app-review-42/, 'The corrected team labels must use a fresh cache version');

const native = fs.readFileSync('mobile/native-entry.js', 'utf8');
assert.match(native, /buy\.stripe\.com/, 'The native purchase-link guard must remain in place');
assert.match(native, /data-tradeos-billing/, 'The native billing controls must remain hidden');
assert.doesNotMatch(native, /accountPrivacyScript/, 'Account controls must load once from the release HTML');
assert.match(native, /safe-area-inset-top/, 'The native header must clear the iPhone status bar');
assert.match(native, /\.tos-br-fab \{ display: none !important; \}/, 'The floating feedback control must stay hidden in the native app');

const productTheme = fs.readFileSync('app/product-v3.css', 'utf8');
assert.match(productTheme, /\.tos-schedule-stat[^}]*background:#fff!important/, 'Schedule summary cards must use the light product theme');
assert.match(productTheme, /\.tos-unscheduled-job\{background:#fbfcfe!important/, 'Unscheduled job cards must retain readable light-theme contrast');
assert.match(productTheme, /\.tos-schedule-panel\{[^}]*box-sizing:border-box!important[^}]*max-width:100vw!important/, 'The schedule sheet must remain inside the iPhone viewport');
assert.match(productTheme, /\.tos-schedule-panel\{[^}]*background:#fff!important[^}]*color:var\(--v3-text\)!important/, 'The schedule sheet must use readable light-theme colours');
assert.match(productTheme, /\.tos-schedule-field input[^}]*box-sizing:border-box!important[^}]*max-width:100%!important/, 'Schedule inputs must not overflow the sheet');
assert.match(productTheme, /\.tos-sheet-save\{background:var\(--v3-blue\)!important;color:#fff!important/, 'The schedule save action must remain readable');

const scheduleBoard = fs.readFileSync('app/schedule-board.js', 'utf8');
assert.match(scheduleBoard, /removeAttribute\('data-home-simple'\)/, 'Schedule must clear the Home-only visibility marker before rendering');

const capacitor = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
assert.equal(capacitor.appName, 'Veystead', 'The iOS display name must remain Veystead');

const packager = fs.readFileSync('scripts/prepare-mobile.mjs', 'utf8');
assert.match(packager, /app\/_expo/, 'The retired Expo prototype must be excluded from the iOS bundle');
assert.match(packager, /app\/tradeos-beta\.js/, 'The retired local prototype must be excluded from the iOS bundle');
assert.match(packager, /cloud\/app\.js/, 'The retired cloud prototype must be excluded from the iOS bundle');
assert.match(packager, /terms\.html/, 'The legal terms must be included in the iOS bundle');
assert.match(packager, /support\.html/, 'The support page must be included in the iOS bundle');

console.log('App Store release wording and safeguards verified.');
