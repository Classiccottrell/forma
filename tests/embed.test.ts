import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEmbedCode, generateStandaloneHtml } from '../src/runtime/embed.js';
import { embedForma } from '../src/runtime/embedPlayer.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('generateEmbedCode', () => {
  const code = generateEmbedCode({
    shapeId: 'sphere',
    shapeParams: {},
    materialId: 'matte',
    materialParams: {},
    environmentId: 'studio',
    environmentParams: {},
    effectIds: [],
    effectParams: {},
  });

  it('uses the browser bundle without bare module imports', () => {
    expect(code).toMatch(/<script src="\.\/forma\.browser\.v\d+\.\d+\.\d+\.js"><\/script>/);
    expect(code).not.toMatch(/\bfrom ['"](?:forma|three)/);
  });

  it('cannot be broken out of by a string param containing </script>', () => {
    const svg = '<svg></svg></script><script>alert(1)</script>\u2028';
    const hostile = generateEmbedCode({
      shapeId: 'svg-extrude', shapeParams: { svg }, materialId: 'matte', materialParams: {},
      environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {},
    });
    // Only the snippet's own two script elements close.
    expect(hostile.match(/<\/script/gi)).toHaveLength(2);
    const literal = /Forma\.embed\(document\.getElementById\('[^']+'\), (.*)\);\n/.exec(hostile)![1]!;
    expect(JSON.parse(literal).shapeParams.svg).toBe(svg);
  });

  it('every exports map target exists after build', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    for (const entry of Object.values(pkg.exports) as { import: string }[]) {
      const target = resolve(root, entry.import);
      expect(existsSync(target), `${entry.import} missing — run npm run build`).toBe(true);
    }
  });

  it('is one call to Forma.embed, which registers content itself', () => {
    expect(code).toContain('Forma.embed(document.getElementById(');
    expect(code).not.toContain('registerAllContent');
  });

  it('carries the view and asset base, and gives different scenes different ids', () => {
    const base = { shapeId: 'sphere', shapeParams: {}, materialId: 'matte', materialParams: {}, environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {} };
    const withView = generateEmbedCode(base, { view: { backdrop: 'transparent', spin: 12 }, assetBase: 'https://example.test/forma/' });
    const settings = JSON.parse(/\}, (\{"view".*)\);\n/.exec(withView)![1]!);
    expect(settings).toEqual({ view: { backdrop: 'transparent', spin: 12 }, assetBase: 'https://example.test/forma/' });
    const idOf = (s: string) => /<div id="([^"]+)"/.exec(s)![1];
    expect(idOf(generateEmbedCode(base))).not.toBe(idOf(generateEmbedCode({ ...base, materialId: 'chrome' })));
    expect(withView).toContain('height:480px');
  });

  it('builds a standalone page that can inline the bundle safely', () => {
    const base = { shapeId: 'sphere', shapeParams: {}, materialId: 'matte', materialParams: {}, environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {} };
    const page = generateStandaloneHtml(base, { inlineLibrary: 'var Forma={};var s="</script>";\n//# sourceMappingURL=forma.js.map\n', title: 'A <b>scene</b>' });
    expect(page).not.toContain('sourceMappingURL');
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('<title>A &lt;b>scene&lt;/b></title>');
    expect(page).not.toContain('<script src=');
    expect(page.match(/<\/script/gi)).toHaveLength(2); // the bundle's own "</script>" is escaped
    expect(page).toContain('height:100vh');
    expect(page).not.toContain('forma-scroll-room');
    const scrolling = generateStandaloneHtml({ ...base, matter: { form: 'gas', disperse: 0, motion: 'scroll', drive: 'form', cursor: 'push', strength: 1, radius: 0.22, density: 'low' } });
    expect(scrolling.match(/class="forma-scroll-room"/g)).toHaveLength(2); // room above and below to scroll through
  });

  it('escapes a custom browser bundle URL', () => {
    expect(generateEmbedCode({
      shapeId: 'sphere', shapeParams: {}, materialId: 'matte', materialParams: {},
      environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {},
    }, { libraryUrl: 'https://cdn.example.test/a?x=1&y=2' })).toContain(
      'https://cdn.example.test/a?x=1&amp;y=2'
    );
  });
});

describe('embedForma', () => {
  it('marks the element and rejects ready when WebGL is unavailable', async () => {
    ensureHarnessContentRegistered();
    const el = document.createElement('div');
    const embed = embedForma(el, {
      shapeId: 'sphere', shapeParams: {}, materialId: 'matte', materialParams: {}, environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {},
    }, { lazy: false });
    await expect(embed.ready).rejects.toBeTruthy();
    expect(el.dataset.formaError).toBe('webgl');
    expect(embed.runtime).toBeNull();
    embed.dispose();
  });
});
