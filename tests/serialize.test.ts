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

  it.each([
    ['not-json', 'invalid JSON'],
    ['null', 'composition must be an object'],
    ['[]', 'composition must be an object'],
    ['{"shapeParams":{}}', 'shapeId must be a string'],
    [JSON.stringify({ ...baseComposition(), shapeParams: null }), 'shapeParams must be an object'],
    [JSON.stringify({ ...baseComposition(), materialId: 42 }), 'materialId must be a string'],
    [JSON.stringify({ ...baseComposition(), environmentParams: [] }), 'environmentParams must be an object'],
    [JSON.stringify({ ...baseComposition(), effectIds: {} }), 'effectIds must be an array'],
    [JSON.stringify({ ...baseComposition(), effectIds: [42] }), 'effectIds must contain only strings'],
    [JSON.stringify({ ...baseComposition(), effectParams: [] }), 'effectParams must be an object'],
    [JSON.stringify({ ...baseComposition(), effectParams: { none: null } }), 'effectParams.none must be an object'],
  ])('rejects malformed input: %s', (input, message) => {
    expect(() => deserializeComposition(input)).toThrow(`deserializeComposition: ${message}`);
  });
});
