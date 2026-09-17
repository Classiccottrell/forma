import { describe, it, expect } from 'vitest';
import { slotKey } from '../src/index.js';
import type { Composition } from '../src/index.js';
import { makeHeadlessRuntime, ensureHarnessContentRegistered } from './testUtils.js';

ensureHarnessContentRegistered();

function baseComposition(): Composition {
  return {
    shapeId: 'sphere',
    shapeParams: { radius: 1, detail: 3 },
    materialId: 'matte',
    materialParams: { color: '#7f78ff', roughness: 0.9 },
    environmentId: 'studio',
    environmentParams: {},
    effectIds: [],
    effectParams: {},
  };
}

describe('slotKey stability', () => {
  it('is stable across hot-param-only changes (material color)', () => {
    const a = baseComposition();
    const b = { ...a, materialParams: { ...a.materialParams, color: '#ff0000' } };
    expect(slotKey('material', a)).toBe(slotKey('material', b));
    expect(slotKey('shape', a)).toBe(slotKey('shape', b));
  });

  it('changes when a rebuild:true param changes (shape radius)', () => {
    const a = baseComposition();
    const b = { ...a, shapeParams: { ...a.shapeParams, radius: 1.5 } };
    expect(slotKey('shape', a)).not.toBe(slotKey('shape', b));
  });

  it('changes when the shapeId changes', () => {
    const a = baseComposition();
    const b = { ...a, shapeId: 'box', shapeParams: { size: 1, segments: 1 } };
    expect(slotKey('shape', a)).not.toBe(slotKey('shape', b));
  });
});

describe('applyComposition slot decoupling', () => {
  it('never touches an unrelated slot on a partial change (material-only switch leaves shape registry identity unchanged)', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(baseComposition());
    const shapeRegistryBefore = runtime.getSlotRegistry('shape');
    const envRegistryBefore = runtime.getSlotRegistry('environment');

    const next = { ...baseComposition(), materialId: 'metal', materialParams: { color: '#cfd6e6', metalness: 0.9 } };
    runtime.applyComposition(next);

    expect(runtime.getSlotRegistry('shape')).toBe(shapeRegistryBefore);
    expect(runtime.getSlotRegistry('environment')).toBe(envRegistryBefore);
    expect(runtime.getSlotRegistry('material')).not.toBe(shapeRegistryBefore);
  });

  it('rebuilds the shape slot (new registry instance) when shapeId changes', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(baseComposition());
    const shapeRegistryBefore = runtime.getSlotRegistry('shape');

    runtime.applyComposition({ ...baseComposition(), shapeId: 'box', shapeParams: { size: 1, segments: 1 } });

    expect(runtime.getSlotRegistry('shape')).not.toBe(shapeRegistryBefore);
  });

  it('routes a hot param change through update(), not a rebuild (material registry instance unchanged)', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(baseComposition());
    const materialRegistryBefore = runtime.getSlotRegistry('material');

    runtime.applyComposition({ ...baseComposition(), materialParams: { color: '#00ff00', roughness: 0.9 } });

    expect(runtime.getSlotRegistry('material')).toBe(materialRegistryBefore);
  });
});
