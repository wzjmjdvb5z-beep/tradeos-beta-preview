import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const out = 'mobile-web';

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const dir of ['app', 'cloud', 'quote', 'invoice']) {
  await cp(dir, `${out}/${dir}`, { recursive: true });
}

// Do not ship retired, unreachable prototypes in the App Store bundle. They are
// not referenced by app/index.html and contain old pre-release presentation.
for (const path of [
  `${out}/app/_expo`,
  `${out}/app/tradeos-beta.js`,
  `${out}/app/tradeos-beta.css`,
  `${out}/cloud/app.js`,
  `${out}/cloud/app-v2.js`
]) {
  await rm(path, { recursive: true, force: true });
}

for (const file of ['index.html', 'account.html', 'feedback.html', 'privacy.html']) {
  await cp(file, `${out}/${file}`);
}

await build({
  entryPoints: ['mobile/native-entry.js'],
  outfile: `${out}/app/mobile-native.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari16'],
  minify: true,
  sourcemap: false,
  legalComments: 'none'
});

const appIndexPath = `${out}/app/index.html`;
let appIndex = await readFile(appIndexPath, 'utf8');
if (!appIndex.includes('mobile-native.js')) {
  appIndex = appIndex.replace('</body>', '  <script src="./mobile-native.js?v=1" defer></script>\n</body>');
  await writeFile(appIndexPath, appIndex, 'utf8');
}

console.log('Prepared mobile web bundle in mobile-web/.');
