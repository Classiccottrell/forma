// Production homepage smoke test. Run against `npm run preview -- --port 5183`.
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = 'http://127.0.0.1:5183/';
let failures = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failures++; };

for (const [name, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('heading', { name: /3D shapes your visitors/ }).waitFor();
  check(`${name}: main call to action reaches editor`, (await page.getByRole('link', { name: /Open the editor/ }).first().getAttribute('href')) === '/editor');
  check(`${name}: three scene cards are present`, await page.locator('.hp-scene').count() === 3);
  check(`${name}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (name === 'desktop') {
    await page.getByRole('button', { name: 'Run the live scene' }).click();
    const frame = page.frameLocator('.hp-frame');
    await frame.locator('[data-forma-ready]').waitFor({ timeout: 60000 });
    check('desktop: the live hero scene initializes', await page.locator('.hp-frame').count() === 1);
    const before = await page.locator('.hp-frame').getAttribute('src');
    await page.locator('.hp-scene:not([aria-pressed="true"])').first().click();
    const after = await page.locator('.hp-frame').getAttribute('src');
    check('desktop: scene cards switch the hero', before !== after);
  }
  check(`${name}: no page errors`, errors.length === 0);
  await page.screenshot({ path: `/tmp/forma-home-${name}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log(`${failures ? 'FAIL' : 'PASS'} homepage smoke test`);
process.exit(failures ? 1 : 0);
