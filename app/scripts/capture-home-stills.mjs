// Captures the homepage's still images into public/home/: a poster for each composed
// scene (shown before the live scene loads, and instead of it under reduced motion) and
// one image each for solid, liquid and gas.
//
// Run with the dev server up, after a library build:
//   npm run dev -- --port 5183 --strictPort   (in another terminal)
//   node scripts/capture-home-stills.mjs
//
// Headless system Chrome on SwiftShader only: a hardware GL context can freeze some
// desktops (see e2e/verify-m3.mjs), and stills from one renderer keep the set consistent.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = process.env.FORMA_DEV_ORIGIN ?? 'http://localhost:5183';
const OUT = resolve(APP, 'public/home');
mkdirSync(OUT, { recursive: true });

const dist = (file) => import(pathToFileURL(resolve(APP, '../dist', file)).href);
const content = await dist('content/index.js');
const { composition } = await dist('content/presets.js');
const { generateEmbedCode } = await dist('runtime/embed.js');
content.registerAllContent();

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const probe = await browser.newPage();
const gl = await probe.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; });
await probe.close();
if (!/swiftshader/i.test(gl)) { await browser.close(); throw new Error(`not SwiftShader: ${gl}`); }

const save = async (page, name) => {
  await page.screenshot({ path: resolve(OUT, `${name}.jpg`), type: 'jpeg', quality: 84 });
  console.log('wrote', `public/home/${name}.jpg`);
};

// Scene posters, 16:9.
const wide = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const scene of content.composedScenes()) {
  await wide.goto(`${ORIGIN}/scenes/${scene.id}.html`, { waitUntil: 'load' });
  await wide.waitForSelector('[data-forma-ready]', { state: 'attached', timeout: 90_000 });
  await wide.waitForTimeout(6000);
  await save(wide, `scene-${scene.id}`);
}
await wide.close();

// The three forms, square, on Deep Space with atmosphere.
const forms = { solid: { form: 'solid', disperse: 0 }, liquid: { form: 'liquid', disperse: 0.3 }, gas: { form: 'gas', disperse: 0.45 } };
const square = await browser.newPage({ viewport: { width: 640, height: 640 } });
for (const [name, matter] of Object.entries(forms)) {
  const scene = { ...composition({ shapeId: 'soft-blob', materialId: process.env.FORM_MATERIAL ?? 'metal', environmentId: 'deep-space', matter: { ...matter, motion: 'manual', cursor: 'off' } }), atmosphere: { haze: 0.5, dust: 0.5 } };
  const snippet = generateEmbedCode(scene, { libraryUrl: `${ORIGIN}/embed/forma.js`, assetBase: `${ORIGIN}/`, height: '100vh', view: { fill: 0.5, azimuth: 24, elevation: 8 } });
  await square.setContent(`<!doctype html><body style="margin:0;background:#05060c">${snippet}</body>`, { waitUntil: 'load' });
  await square.waitForSelector('[data-forma-ready]', { state: 'attached', timeout: 90_000 });
  await square.waitForTimeout(7000);
  await save(square, `form-${name}`);
}
await browser.close();
