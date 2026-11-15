// Renders Liquid across materials, environments and Disperse values as PNGs, one per
// combination, for reviewing the liquid's look (and for before/after in a PR).
//
//   npm run dev -- --port 5183 --strictPort        (another terminal; library built first)
//   OUT=/tmp/liquid node e2e/liquid-sheet.mjs
//   COMBOS='{"gold-puddle":{"material":"gold","disperse":0.6}}' OUT=/tmp/liquid node e2e/liquid-sheet.mjs
//
// Each combination is opened as a scene link (#scene=...), so it needs no clicking. A combo
// is { material, shape?, env?, disperse?, form?, atmos? }. Headless system Chrome on
// SwiftShader only, like the other scripts here.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const dist = (f) => import(pathToFileURL(resolve('..', 'dist', f)).href);
const content = await dist('content/index.js'); const { composition } = await dist('content/presets.js'); const { serializeComposition } = await dist('index.js');
content.registerAllContent();
const OUT = process.env.OUT ?? '/tmp/forma-liquid';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const ORIGIN = process.env.FORMA_URL ?? 'http://localhost:5183';
const combos = JSON.parse(process.env.COMBOS ?? JSON.stringify({
  chrome: { material: 'chrome' }, glass: { material: 'glass' }, matte: { material: 'matte' },
  gold: { material: 'gold' }, obsidian: { material: 'obsidian' }, ice: { material: 'ice' },
  'chrome-space': { material: 'chrome', env: 'deep-space' }, 'chrome-puddle': { material: 'chrome', env: 'deep-space', disperse: 1 },
  'gold-half-melted': { material: 'gold', disperse: 0.6 }, 'glass-midnight': { material: 'glass', env: 'midnight' },
}));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const probe = await browser.newPage(); const gl = await probe.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const e = c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(e.UNMASKED_RENDERER_WEBGL); }); await probe.close();
if (!/SwiftShader/i.test(gl)) { console.log('ABORT', gl); process.exit(1); }
const errs = [];
for (const [name, spec] of Object.entries(combos)) {
  const c = composition({ shapeId: spec.shape ?? 'soft-blob', materialId: spec.material, environmentId: spec.env ?? 'gradient-sky', matter: { form: spec.form ?? 'liquid', disperse: spec.disperse ?? 0, motion: 'manual', cursor: 'off' } });
  if (spec.atmos !== false) c.atmosphere = { haze: 0.5, dust: 0.5 };
  const page = await browser.newPage({ viewport: { width: 760, height: 560 } });
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(name + ': ' + m.text().slice(0, 120)); });
  await page.addInitScript(() => { try { localStorage.setItem('forma-onboarding-dismissed', '1'); } catch {} });
  await page.goto(`${ORIGIN}/editor#scene=` + b64({ c: JSON.parse(serializeComposition(c)), v: {} }), { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="viewport-host"] canvas', { state: 'attached', timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: 'Close panel' }).click().catch(() => {}); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}.png` }); await page.close();
}
console.log(`wrote ${Object.keys(combos).length} images to ${OUT}`);
console.log('console:', [...new Set(errs)].slice(0, 4).join(' | ') || 'none');
await browser.close();
