import { describe, it, expect } from 'vitest';
import { serializeComposition, deserializeComposition, replaceRetiredShape, shapeRegistry } from '../src/index.js';
import type { Composition } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

ensureHarnessContentRegistered();

function baseComposition(): Composition {
  return {
    shapeId: 'torus',
    shapeParams: { radius: 0.8, tube: 0.3, radialSegments: 16 },
    materialId: 'glass',
    materialParams: { color: '#ffffff', transmission: 0.9 },
    textureId: 'none',
    textureParams: {},
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

  it('normalizes legacy compositions without a texture slot', () => {
    const legacy = { ...baseComposition() } as Record<string, unknown>;
    delete legacy.textureId;
    delete legacy.textureParams;
    expect(deserializeComposition(JSON.stringify(legacy))).toMatchObject({ textureId: 'none', textureParams: {} });
  });

  it('rejects an unknown textureId and mismatched texture params', () => {
    expect(() => deserializeComposition(serializeComposition({ ...baseComposition(), textureId: 'missing', textureParams: {} }))).toThrow(/unknown id/);
    expect(() => deserializeComposition(serializeComposition({ ...baseComposition(), textureId: 'checker-normal', textureParams: {} }))).toThrow(/textureParams/);
  });

  // hoodie, polo and cap shipped in #12 and were removed; files saved with them
  // carry their old param keys and must still open, on the stand-in shape.
  it.each([
    ['hoodie', { size: 1.6, thickness: 0.1, roundness: 0.8, smoothing: 2 }],
    ['polo', { size: 1.6, thickness: 0.1, roundness: 0.8, smoothing: 2 }],
    ['cap', { crownHeight: 0.6, brimLength: 0.5, brimTilt: 0.1, brimCurve: 0.3, seams: 6 }],
  ])('opens a composition saved with the retired %s shape', (shapeId, shapeParams) => {
    expect(shapeRegistry.get(shapeId)).toBeUndefined();
    const round = deserializeComposition(serializeComposition({ ...baseComposition(), shapeId, shapeParams }));
    expect(round).toEqual({ ...baseComposition(), shapeId: 'sphere', shapeParams: shapeRegistry.require('sphere').defaultParameters });
  });

  it('opens a composition saved with the retired Bevelled Box as a Box', () => {
    const saved = serializeComposition({ ...baseComposition(), shapeId: 'bevelled-box', shapeParams: { size: 1.2, depth: 1.2, bevel: 0.08 } });
    expect(deserializeComposition(saved)).toMatchObject({ shapeId: 'box', shapeParams: shapeRegistry.require('box').defaultParameters });
  });

  // Faceted Gem became Quartz Crystal and Badge became Coin, keeping their ids but not their
  // parameters; files saved with the old parameters open as the new shape at its defaults.
  it.each([
    ['gem', { radius: 1, facets: 0 }],
    ['badge', { width: 1.2, height: 0.55, depth: 0.16, roundness: 0.2, smoothness: 6 }],
  ])('opens a %s saved with its old parameters', (shapeId, shapeParams) => {
    const round = deserializeComposition(serializeComposition({ ...baseComposition(), shapeId, shapeParams }));
    expect(round).toMatchObject({ shapeId, shapeParams: shapeRegistry.require(shapeId).defaultParameters });
  });

  it('leaves compositions on current shapes untouched', () => {
    const c = baseComposition();
    expect(replaceRetiredShape(c)).toBe(c);
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
