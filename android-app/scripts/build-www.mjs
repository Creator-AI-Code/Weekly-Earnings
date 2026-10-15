// Copies the web app from the repo root into www/ for Capacitor, adds capacitor.js and a vendored supabase-js.
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const root = path.resolve(app, '..');
const www = path.join(app, 'www');
const SUPABASE_UMD = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

await rm(www, { recursive: true, force: true });
await mkdir(path.join(www, 'vendor'), { recursive: true });
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png']) await copyFile(path.join(root, f), path.join(www, f));

// capacitor.js (core runtime, gives window.Capacitor.registerPlugin without a bundler)
const capJs = path.join(app, 'node_modules/@capacitor/core/dist/capacitor.js');
if (!existsSync(capJs)) throw new Error('Run npm install first: ' + capJs + ' missing');
await copyFile(capJs, path.join(www, 'capacitor.js'));

let html = await readFile(path.join(root, 'index.html'), 'utf8');
if (!html.includes('src="capacitor.js"')) html = html.replace('</head>', '<script src="capacitor.js"></script>\n</head>');
await writeFile(path.join(www, 'index.html'), html);

// vendored supabase-js so realtime does not depend on the CDN inside the APK (the app falls back to the CDN, then to polling)
try {
  const r = await fetch(SUPABASE_UMD);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  await writeFile(path.join(www, 'vendor/supabase.min.js'), Buffer.from(await r.arrayBuffer()));
  console.log('vendored supabase-js');
} catch (e) {
  console.warn('WARN: could not vendor supabase-js (' + e.message + '); the app will use the CDN or polling.');
}
console.log('www ready:', www);
