// End to end: the editor's "On a linefield background" export, then the file it makes.
//
// Needs a linefield checkout whose downloads/ carry the page current (its
// shared/current.js), and an app build pointed at this script's local copy of them:
//
//   VITE_LINEFIELD_DOWNLOADS=http://127.0.0.1:5821/ npm run build
//   LINEFIELD_DOWNLOADS_DIR=../../linefield/downloads node e2e/verify-composed.mjs
//
// Headless system Chrome on SwiftShader only (see verify-m3.mjs for why).
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LF = resolve(process.env.LINEFIELD_DOWNLOADS_DIR ?? resolve(APP, '../../linefield/downloads'));
const OUT = join(tmpdir(), 'forma-on-funnel.html');
const lf = createServer((req, res) => {
  const f = join(LF, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f)) return res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end();
  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }); res.end(readFileSync(f));
});
await new Promise((r) => lf.listen(5821, '127.0.0.1', r));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.hdr': 'application/octet-stream', '.svg': 'image/svg+xml', '.json': 'application/json' };
const app = createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  let f = join(APP, 'dist', rel);
  if (!existsSync(f) || rel.endsWith('/') || !extname(f)) f = join(APP, 'dist', 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise((r) => app.listen(5822, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-video-decode', '--allow-file-access-from-files'] });
const probe = await browser.newPage();
const gl = await probe.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; });
await probe.close();
if (!/swiftshader/i.test(gl)) { await browser.close(); throw new Error('not SwiftShader'); }
const results = []; const ok = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { localStorage.setItem('forma:onboarding-dismissed', '1'); const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl = { href: this.href, name: this.download }; return; } return click.call(this); }; });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:5822/editor');
await page.waitForSelector('[data-testid="viewport-host"] canvas');
await page.waitForTimeout(1500);
// Matter on, as gas, so there is something to ride the flow.
const gas = page.getByRole('radio', { name: 'Gas' });
if (!(await gas.isVisible())) await page.getByRole('button', { name: /^Matter/ }).first().click();
await gas.click();
await page.getByLabel('Disperse').fill('0.6');
if (!(await page.getByTestId('composed-download-btn').isVisible())) await page.getByRole('button', { name: /^Export/ }).first().click();
await page.getByRole('radiogroup', { name: 'linefield piece' }).getByRole('radio', { name: 'Funnel' }).click();
await page.getByTestId('composed-download-btn').click();
await page.waitForFunction(() => window.__dl, null, { timeout: 60000 });
const dl = await page.evaluate(async () => ({ name: window.__dl.name, text: await (await fetch(window.__dl.href)).text() }));
const status = await page.locator('.status-message').innerText();
ok('editor downloads a composed page', dl.name === 'forma-on-funnel.html' && dl.text.includes('__LF_BAKED_VALUES__') && dl.text.includes('Forma.embed('), `${dl.name}, ${(dl.text.length / 1024).toFixed(0)} KB`);
ok('status says what was made, with no "older build" warning', /one file/.test(status) && !/older/.test(status), status);
ok('the page links no script or asset over the network for its code', !/<script src=/.test(dl.text));
writeFileSync(OUT, dl.text);
ok('no page errors in the editor', errors.length === 0, errors.join(' | '));

// The downloaded file, opened from disk like a user would.
const file = await ctx.newPage();
const fileErrors = []; file.on('pageerror', (e) => fileErrors.push(e.message));
await file.goto('file://' + OUT);
await file.waitForSelector('[data-forma-ready]', { timeout: 60000 });
await file.mouse.move(700, 300); await file.mouse.move(760, 330, { steps: 5 });
await file.waitForTimeout(9000);
const state = await file.evaluate(() => { const c = globalThis.__pageCurrent__; const el = document.querySelector('[data-forma-composed]'); return { members: c.members.sort(), body: c.body, field: !!c.field, palette: !!c.palette, cursor: c.cursor, pointer: c.pointer, overlay: getComputedStyle(el).pointerEvents, canvases: document.querySelectorAll('canvas').length }; });
ok('both sides joined the current from a file on disk', state.members.join() === 'forma,linefield', state.members.join());
ok('the object is published where Funnel keeps its mouth', state.body && Math.abs(state.body.x / 1440 - 0.56) < 0.01 && Math.abs(state.body.y / 900 - 0.3) < 0.01 && state.body.form === 'gas' && Math.abs(state.body.disperse - 0.6) < 0.01, JSON.stringify(state.body));
ok('the background publishes its flow and palette', state.field && state.palette);
ok('the page pointer reaches the current through the click-through overlay', state.overlay === 'none' && state.pointer.active && state.pointer.x === 760, JSON.stringify(state.pointer));
ok('no page errors in the composed file', fileErrors.length === 0, fileErrors.join(' | '));

// A showcase scene through Preview.
const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByTestId('composed-scene-into-the-well').click()]);
await popup.waitForSelector('[data-forma-ready]', { timeout: 60000 });
await popup.waitForTimeout(4000);
const title = await popup.title();
const members = await popup.evaluate(() => globalThis.__pageCurrent__.members.sort().join());
ok('a showcase scene opens in a preview tab', title === 'Into the Well' && members === 'forma,linefield', `${title}; ${members}`);
await browser.close(); lf.close(); app.close();
console.log(`${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
