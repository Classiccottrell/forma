import { beforeAll, describe, expect, it } from 'vitest';
import { environmentRegistry } from '../src/index.js';
import { makeDeepSpaceTexture } from '../src/content/environments.js';
import { registerAllContent } from '../src/content/index.js';

describe('Deep Space environment', () => {
  beforeAll(() => registerAllContent());

  it('is registered as a backdrop', () => {
    expect(environmentRegistry.require('deep-space').category).toBe('backdrop');
  });

  it('builds the same dark, starry texture every time', () => {
    const a = makeDeepSpaceTexture().image.data as Uint8Array;
    const b = makeDeepSpaceTexture().image.data as Uint8Array;
    expect(Array.from(a)).toEqual(Array.from(b));
    let sum = 0, max = 0;
    for (let i = 0; i < a.length; i += 4) { const l = (a[i]! + a[i + 1]! + a[i + 2]!) / 3; sum += l; max = Math.max(max, l); }
    expect(sum / (a.length / 4)).toBeLessThan(40); // mostly deep blue-black
    expect(max).toBeGreaterThan(150); // with stars in it
  });
});
