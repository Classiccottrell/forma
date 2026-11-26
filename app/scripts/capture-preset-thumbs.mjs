// Capture the actual built-in scenes used by PresetGallery. Run after the
// library build with `npm run dev -- --port 5183 --strictPort` in app/.
// Chrome uses SwiftShader so committed captures do not depend on a host GPU.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = process.env.FORMA_DEV_ORIGIN ?? 'http://localhost:5183';
const OUT = resolve(APP, 'public/presets');
mkdirSync(OUT, { recursive: true });

const dist = (file) => import(pathToFileURL(resolve(APP, '../dist', file)).href);
const content = await dist('content/index.js');
const { generateEmbedCode } = await dist('runtime/embed.js');
content.registerAllContent();

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const probe = await browser.newPage();
  const gl = await probe.evaluate(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl');
    const ext = ctx?.getExtension('WEBGL_debug_renderer_info');
    return ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  });
  await probe.close();
  if (!/swiftshader/i.test(gl)) throw new Error(`Expected SwiftShader, got ${gl}`);

  const presets = content.builtInPresets();
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1]?.split(',') : null;
  if (only && only.some(id => !presets.some(preset => preset.id === id))) {
    throw new Error(`Unknown preset in --only: ${only.join(',')}`);
  }
  for (const preset of presets) {
    if (only && !only.includes(preset.id)) continue;
    const page = await browser.newPage({ viewport: { width: 480, height: 300 }, reducedMotion: 'reduce' });
    try {
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      const snippet = generateEmbedCode(preset.composition, {
        libraryUrl: `${ORIGIN}/embed/forma.js`,
        assetBase: `${ORIGIN}/`,
        height: '100vh',
        view: { fill: 0.56, azimuth: 20, elevation: 8 },
      });
      await page.setContent(`<!doctype html><html><body style="margin:0;background:#0c1019">${snippet}</body></html>`, { waitUntil: 'load' });
      await page.waitForSelector('[data-forma-ready]', { state: 'attached', timeout: 90_000 });
      await page.waitForTimeout(1800);
      if (errors.length) throw new Error(`${preset.id}: ${errors.join('; ')}`);
      await page.screenshot({ path: resolve(OUT, `${preset.id}.png`) });
      console.log(`captured ${preset.id}`);
    } finally {
      await page.close();
    }
  }

  // Review the exact committed assets together at approximately picker size.
  const sheet = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  const tiles = presets.map(preset => {
    const image = readFileSync(resolve(OUT, `${preset.id}.png`)).toString('base64');
    return `<figure><img src="data:image/png;base64,${image}" alt=""><figcaption>${preset.name}</figcaption></figure>`;
  }).join('');
  await sheet.setContent(`<style>body{margin:0;padding:18px;background:#111319;color:#fff;font:13px system-ui}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}img{display:block;width:100%;border-radius:8px}figcaption{padding:5px}</style><main>${tiles}</main>`);
  await sheet.screenshot({ path: '/tmp/forma-preset-sheet.png', fullPage: true });
  await sheet.close();
  console.log('review /tmp/forma-preset-sheet.png');
} finally {
  await browser.close();
}
