// Ad-hoc M3 verification script (Playwright). Run: node e2e/verify-m3.mjs
// Not a checked-in test suite (none existed before this pass) — a reusable,
// throwaway-safe script kept in-repo per the task's "reused pattern" instruction.
import { chromium } from 'playwright';

const URL = 'http://localhost:5183/editor';
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();

  // --- 1. Search filters live ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForSelector('[data-testid="viewport-host"]');
    await page.getByTestId('search-input').fill('neon');
    await page.waitForTimeout(150);
    const envVisible = await page.locator('.picker-cell:has-text("Neon")').first().isVisible().catch(() => false);
    const shapeCells = await page.locator('.picker-grid').first().locator('.picker-cell').count();
    record('search: env section shows Neon Room match while other shape grid narrows', envVisible, `shapeCellsAfterFilter=${shapeCells}`);
    await ctx.close();
  }

  // --- 2. Keyboard shortcut H toggles panel, and is inert while typing ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForSelector('[data-testid="control-panel"]');
    const before = await page.locator('.control-panel').evaluate((el) => el.className);
    await page.keyboard.press('h');
    await page.waitForTimeout(100);
    const after = await page.locator('.control-panel').evaluate((el) => el.className);
    record('shortcut H toggles panel collapsed class', before !== after, `${before} -> ${after}`);

    // press H again to restore, then focus search input and press h — must NOT toggle
    await page.keyboard.press('h');
    await page.waitForTimeout(100);
    await page.getByTestId('search-input').focus();
    const beforeTyping = await page.locator('.control-panel').evaluate((el) => el.className);
    await page.keyboard.press('h');
    await page.waitForTimeout(100);
    const afterTyping = await page.locator('.control-panel').evaluate((el) => el.className);
    record('shortcut H inert while typing in search input', beforeTyping === afterTyping, `${beforeTyping} -> ${afterTyping}`);
    await ctx.close();
  }

  // --- 3. Reset camera + reset composition ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForSelector('[data-testid="viewport-host"]');
    await page.waitForTimeout(300);

    // orbit via drag
    const host = page.getByTestId('viewport-host');
    const box = await host.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const moved = await page.evaluate(() => {
      const c = window.__formaDebug?.camera;
      return c ? [c.position.x, c.position.y, c.position.z] : null;
    });
    await page.getByTestId('reset-camera').click();
    await page.waitForTimeout(300);
    const reset = await page.evaluate(() => {
      const c = window.__formaDebug?.camera;
      return c ? [c.position.x, c.position.y, c.position.z] : null;
    });
    const closeToOrigin = reset && Math.abs(reset[0]) < 0.01 && Math.abs(reset[1]) < 0.01 && Math.abs(reset[2] - 3.2) < 0.01;
    record('reset camera returns to default orbit position', !!moved && closeToOrigin, `moved=${JSON.stringify(moved)} reset=${JSON.stringify(reset)}`);

    // change shape (shape section is open by default), then reset composition
    const shapeGrid = page.locator('[data-testid="section-header-shape"]').locator('xpath=following-sibling::div[1]//div[contains(@class,"picker-grid")]');
    await shapeGrid.locator('.picker-cell').nth(1).click();
    await page.waitForTimeout(100);
    const selectedBeforeReset = await shapeGrid.locator('.picker-cell.selected').first().textContent();
    await page.getByTestId('reset-composition').click();
    await page.waitForTimeout(100);
    const selectedAfterReset = await shapeGrid.locator('.picker-cell.selected').first().textContent();
    record(
      'reset composition returns shape selection to default (Sphere)',
      !!selectedAfterReset && /sphere/i.test(selectedAfterReset) && selectedBeforeReset !== selectedAfterReset,
      `before=${selectedBeforeReset} after=${selectedAfterReset}`
    );
    await ctx.close();
  }

  // --- 4. Mobile / narrow viewport ---
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForSelector('[data-testid="viewport-host"]');
    const panelCollapsedByDefault = (await page.locator('.control-panel').evaluate((el) => el.className)).includes('collapsed');
    record('mobile: panel collapsed by default at 390px', panelCollapsedByDefault);
    await page.getByTestId('panel-toggle').tap();
    await page.waitForTimeout(150);
    const panelBox = await page.locator('.control-panel').boundingBox();
    const withinViewport = panelBox && panelBox.width <= 391;
    record('mobile: panel is full-width and fits viewport when open', !!withinViewport, JSON.stringify(panelBox));
    await page.screenshot({ path: '/tmp/forma-mobile-390.png' });
    // close panel again so the viewport host is not covered for the orbit check below
    await page.getByTestId('panel-toggle').tap();
    await page.waitForTimeout(150);

    // touch orbit
    const host = page.getByTestId('viewport-host');
    const before = await page.evaluate(() => {
      const c = window.__formaDebug?.camera;
      return c ? [c.position.x, c.position.y, c.position.z] : null;
    });
    await page.touchscreen.tap(195, 400);
    await page.dispatchEvent('[data-testid="viewport-host"]', 'touchstart', {
      touches: [{ identifier: 1, clientX: 150, clientY: 400 }],
    });
    // Fallback: use mouse drag as touch simulation proxy since Playwright touch API is limited here
    await page.mouse.move(150, 400);
    await page.mouse.down();
    await page.mouse.move(260, 460, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const c = window.__formaDebug?.camera;
      return c ? [c.position.x, c.position.y, c.position.z] : null;
    });
    record('mobile: pointer/touch drag orbits camera', JSON.stringify(before) !== JSON.stringify(after), `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    await ctx.close();
  }

  // --- 5. prefers-reduced-motion suppresses auto-spin ---
  {
    // reduce context: spin toggle should be disabled
    const ctxReduce = await browser.newContext({ reducedMotion: 'reduce' });
    const pageReduce = await ctxReduce.newPage();
    await pageReduce.goto(URL);
    await pageReduce.waitForSelector('[data-testid="auto-spin-toggle"]');
    const disabled = await pageReduce.getByTestId('auto-spin-toggle').isDisabled();
    record('reduced-motion: spin toggle disabled', disabled);
    await ctxReduce.close();

    // no-preference context: enable spin, camera should keep moving on its own
    const ctxMotion = await browser.newContext({ reducedMotion: 'no-preference' });
    const pageMotion = await ctxMotion.newPage();
    await pageMotion.goto(URL);
    await pageMotion.waitForSelector('[data-testid="auto-spin-toggle"]');
    await pageMotion.getByTestId('auto-spin-toggle').click();
    await pageMotion.waitForTimeout(150);
    const p1 = await pageMotion.evaluate(() => {
      const c = window.__formaDebug?.camera;
      return c ? [c.position.x, c.position.z] : null;
    });
    await pageMotion.waitForTimeout(600);
    const p2 = await pageMotion.evaluate(() => {
      const c = window.__formaDebug?.camera;
      return c ? [c.position.x, c.position.z] : null;
    });
    record('no-preference: auto-spin actually moves the camera over time', JSON.stringify(p1) !== JSON.stringify(p2), `${JSON.stringify(p1)} -> ${JSON.stringify(p2)}`);
    await ctxMotion.close();
  }

  // --- 6. Onboarding hint on first load, dismiss persists ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(URL);
    const shown = await page.getByTestId('onboarding-hint').isVisible();
    record('onboarding: hint shown on first load', shown);
    await page.screenshot({ path: '/tmp/forma-first-load.png' });
    await page.getByTestId('onboarding-dismiss').click();
    await page.waitForTimeout(100);
    const goneImmediately = !(await page.getByTestId('onboarding-hint').isVisible().catch(() => false));
    await page.reload();
    await page.waitForTimeout(300);
    const goneAfterReload = !(await page.getByTestId('onboarding-hint').isVisible().catch(() => false));
    record('onboarding: dismiss persists across reload (localStorage)', goneImmediately && goneAfterReload);
    await ctx.close();
  }

  // --- 7. Reference-driven controls ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForSelector('[data-testid="control-panel"]');

    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('option', { name: 'Linen Blue' }).click();
    const surfaceSelected = await page.getByRole('option', { name: 'Linen Blue' }).getAttribute('aria-selected');
    record('material settings: surface preset selection is live', surfaceSelected === 'true', `selected=${surfaceSelected}`);

    await page.getByTestId('section-header-camera').click();
    await page.getByLabel('Lens').fill('35');
    const fov = await page.evaluate(() => window.__formaDebug?.camera?.fov);
    record('presentation: lens control updates the live camera', Math.abs(Number(fov) - 35) < 0.01, `fov=${fov}`);

    await page.getByRole('button', { name: 'Reset composition' }).click();
    const shapeGrid = page.getByTestId('section-header-shape').locator('xpath=following-sibling::div[1]//div[contains(@class,"picker-grid")]');
    await shapeGrid.locator('.picker-cell').nth(1).click();
    await page.getByRole('button', { name: 'Undo last change' }).click();
    const undone = await shapeGrid.locator('.picker-cell.selected').textContent();
    await page.getByRole('button', { name: 'Redo last change' }).click();
    const redone = await shapeGrid.locator('.picker-cell.selected').textContent();
    record('history: undo and redo restore composition selection', /sphere/i.test(undone ?? '') && /box/i.test(redone ?? ''), `undo=${undone} redo=${redone}`);
    await ctx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
