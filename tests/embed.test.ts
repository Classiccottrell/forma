import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEmbedCode } from '../src/runtime/embed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Regression test for the M0 bug: generateEmbedCode previously emitted an import
// specifier (`forma/harness-content`) with no matching entry in package.json's
// `exports` map, silently breaking "Copy Code" for any real consumer.
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

  it('imports only specifiers declared in package.json exports', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    const specifiers = [...code.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    for (const spec of specifiers) {
      if (spec === 'forma') {
        expect(pkg.exports['.']).toBeTruthy();
      } else if (spec.startsWith('forma/')) {
        const subpath = './' + spec.slice('forma/'.length);
        expect(pkg.exports[subpath], `${spec} must have an exports map entry`).toBeTruthy();
      }
    }
  });

  it('every exports map target exists after build', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    for (const entry of Object.values(pkg.exports) as { import: string }[]) {
      const target = resolve(root, entry.import);
      expect(existsSync(target), `${entry.import} missing — run npm run build`).toBe(true);
    }
  });

  it('does not import unresolvable content subpath, and registers content before mounting', () => {
    expect(code).not.toContain('forma/harness-content');
    expect(code).toContain("import { registerAllContent } from 'forma/content';");
    expect(code.indexOf('registerAllContent()')).toBeLessThan(code.indexOf('mountForma('));
  });
});
