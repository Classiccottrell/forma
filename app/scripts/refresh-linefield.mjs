// Refreshes the fallback copies of the linefield pieces the composed scenes use
// (app/linefield/<piece>.html) from linefield's published downloads. The build reads the
// live pieces itself; these copies are only used when that fails (offline, or a piece
// removed or broken upstream). Run: npm run linefield:refresh
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.env.VITE_LINEFIELD_DOWNLOADS ?? 'https://classiccottrell.github.io/linefield/downloads/';
const dist = (file) => import(pathToFileURL(resolve(APP, '../dist', file)).href);
const content = await dist('content/index.js');
const { isLinefieldBake } = await dist('runtime/compose.js');
content.registerAllContent();

const wanted = [...new Set(content.composedScenes().map((scene) => scene.piece))];
let failed = 0;
for (const piece of wanted) {
  const url = new URL(`${piece}.html`, SOURCE).href;
  const response = await fetch(url);
  const html = response.ok ? await response.text() : '';
  if (!isLinefieldBake(html)) { console.error(`skip ${piece}: ${url} is ${response.ok ? 'not a linefield bake' : `HTTP ${response.status}`}`); failed++; continue; }
  writeFileSync(resolve(APP, 'linefield', `${piece}.html`), html);
  console.log(`updated app/linefield/${piece}.html (${(html.length / 1024).toFixed(0)} KB)`);
}
const stale = readdirSync(resolve(APP, 'linefield')).filter((f) => f.endsWith('.html') && !wanted.includes(f.replace(/\.html$/, '')));
if (stale.length) console.log(`no scene uses: ${stale.join(', ')} (safe to delete)`);
process.exit(failed ? 1 : 0);
