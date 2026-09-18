import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEmbedCode } from '../src/runtime/embed.js';

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
    expect(code).toContain('<script src="./forma.browser.js"></script>');
    expect(code).not.toMatch(/\bfrom ['"](?:forma|three)/);
  });

  it('every exports map target exists after build', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    for (const entry of Object.values(pkg.exports) as { import: string }[]) {
      const target = resolve(root, entry.import);
      expect(existsSync(target), `${entry.import} missing — run npm run build`).toBe(true);
    }
  });

  it('does not import unresolvable content subpath, and registers content before mounting', () => {
    expect(code).toContain('Forma.registerAllContent()');
    expect(code.indexOf('Forma.registerAllContent()')).toBeLessThan(code.indexOf('Forma.mountForma('));
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
