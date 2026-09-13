import {readFile,writeFile} from 'node:fs/promises';
const delegate='ios/App/App/AppDelegate.swift';
const storyboard='ios/App/App/Base.lproj/Main.storyboard';
const marker='// TRADEOS NATIVE INVOICE EXPORT';
const original=await readFile(delegate,'utf8');
const base=original.split(marker)[0].trimEnd();
const native=await readFile('mobile/ios/InvoiceExport.swift','utf8');
await writeFile(delegate,base+'\n\n'+marker+'\n'+native);
let xml=await readFile(storyboard,'utf8');
if(!xml.includes('customClass="TradeOSViewController"')) {
  const pattern=/customClass="CAPBridgeViewController"(?:\s+customModule="[^"]*")?(?:\s+customModuleProvider="[^"]*")?/;
  if(!pattern.test(xml))throw new Error('Capacitor storyboard controller not found; native export was not installed.');
  xml=xml.replace(pattern,'customClass="TradeOSViewController" customModule="App" customModuleProvider="target"');
  await writeFile(storyboard,xml);
}
console.log('Installed native invoice PDF export and registered bridge controller.');
// Capacitor 8.5+ constructs its root controller in SceneDelegate, bypassing the storyboard.
const scenePath='ios/App/App/SceneDelegate.swift';
try {
  let scene=await readFile(scenePath,'utf8');
  if(!scene.includes('rootViewController = TradeOSViewController()')) {
    if(!scene.includes('rootViewController = CAPBridgeViewController()'))throw new Error('Unknown scene root controller; native export registration cannot be verified.');
    scene=scene.replace('rootViewController = CAPBridgeViewController()','rootViewController = TradeOSViewController()');
    await writeFile(scenePath,scene);
  }
} catch(error) { if(error.code!=='ENOENT')throw error; }
