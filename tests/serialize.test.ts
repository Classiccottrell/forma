import { describe, it, expect } from 'vitest';
import { serializeComposition, deserializeComposition } from '../src/index.js';
import type { Composition } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

ensureHarnessContentRegistered();

function baseComposition(): Composition {
  return {
    shapeId: 'torus',
    shapeParams: { radius: 0.8, tube: 0.3, radialSegments: 16 },
    materialId: 'glass',
    materialParams: { color: '#ffffff', transmission: 0.9 },
    environmentId: 'gradient-sky',
    environmentParams: {},
    effectIds: ['none'],
    effectParams: { none: {} },
  };
}

describe('serialize round-trip', () => {
  it('round-trips exactly', () => {
    const c = baseComposition();
    const round = deserializeComposition(serializeComposition(c));
    expect(round).toEqual(c);
  });

  it('rejects an unknown shapeId', () => {
    const s = serializeComposition({ ...baseComposition(), shapeId: 'nonexistent' });
    expect(() => deserializeComposition(s)).toThrow(/unknown id/);
  });

  it('rejects a params object with keys that do not match the schema', () => {
    const c = { ...baseComposition(), shapeParams: { radius: 0.8, tube: 0.3, radialSegments: 16, extra: 1 } };
    const s = serializeComposition(c);
    expect(() => deserializeComposition(s)).toThrow(/shapeParams/);
  });
});
