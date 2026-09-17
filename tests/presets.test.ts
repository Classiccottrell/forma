import { describe, it, expect } from 'vitest';
import { serializeComposition, deserializeComposition, shapeRegistry, materialRegistry, environmentRegistry, effectRegistry } from '../src/index.js';
import { builtInPresets } from '../src/content/presets.js';
import { surpriseMe } from '../src/content/surpriseMe.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

ensureHarnessContentRegistered();

describe('built-in presets', () => {
  const presets = builtInPresets();

  it('ships a reasonable-sized curated set', () => {
    expect(presets.length).toBeGreaterThanOrEqual(8);
    expect(presets.length).toBeLessThanOrEqual(12);
  });

  it('every preset id is unique', () => {
    const ids = presets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset composition resolves to valid registry entries', () => {
    for (const preset of presets) {
      expect(() => shapeRegistry.require(preset.composition.shapeId), `preset "${preset.id}" shapeId`).not.toThrow();
      expect(() => materialRegistry.require(preset.composition.materialId), `preset "${preset.id}" materialId`).not.toThrow();
      expect(() => environmentRegistry.require(preset.composition.environmentId), `preset "${preset.id}" environmentId`).not.toThrow();
      for (const effectId of preset.composition.effectIds) {
        expect(() => effectRegistry.require(effectId), `preset "${preset.id}" effectId "${effectId}"`).not.toThrow();
      }
    }
  });

  it('every preset composition round-trips through serialize/deserialize', () => {
    for (const preset of presets) {
      const round = deserializeComposition(serializeComposition(preset.composition));
      expect(round).toEqual(preset.composition);
    }
  });

  it('every preset carries a version and non-empty name', () => {
    for (const preset of presets) {
      expect(preset.version).toBe(1);
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });
});

describe('surpriseMe', () => {
  it('produces a valid, registry-resolvable composition', () => {
    for (let i = 0; i < 20; i++) {
      const c = surpriseMe();
      expect(() => shapeRegistry.require(c.shapeId)).not.toThrow();
      expect(() => materialRegistry.require(c.materialId)).not.toThrow();
      expect(() => environmentRegistry.require(c.environmentId)).not.toThrow();
      for (const effectId of c.effectIds) {
        expect(() => effectRegistry.require(effectId)).not.toThrow();
      }
      expect(() => deserializeComposition(serializeComposition(c))).not.toThrow();
    }
  });

  it('never picks the svg-extrude shape (no default svg content to extrude)', () => {
    for (let i = 0; i < 30; i++) {
      expect(surpriseMe().shapeId).not.toBe('svg-extrude');
    }
  });

  it('never pairs wireframe material with a sparse shape', () => {
    const SPARSE = new Set(['soft-blob', 'spiral', 'ring', 'cross']);
    for (let i = 0; i < 50; i++) {
      const c = surpriseMe();
      if (c.materialId === 'wireframe') {
        expect(SPARSE.has(c.shapeId)).toBe(false);
      }
    }
  });

  it('produces variation across repeated calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const c = surpriseMe();
      seen.add(`${c.shapeId}|${c.materialId}|${c.environmentId}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
