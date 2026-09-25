import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';
import { ensureGeometryUVs } from '../src/index.js';

// Registry-wide smoke test (M2 guard, advisor guidance): every shape's create() with
// its own defaultParameters must return real, finite geometry — catches an
// empty/NaN-producing default (e.g. an unparsable SVG default) before it reaches the
// picker UI or the leak-check.
describe('content smoke test — every shape/material creates cleanly from defaults', () => {
  ensureHarnessContentRegistered();

  it('every registered shape builds non-empty, finite geometry from its defaults', () => {
    // `svg-extrude` is excluded here: SVGLoader.parse() calls DOMParser with mime type
    // 'image/svg+xml', which happy-dom does not support (returns a null
    // documentElement) — same class of gap materials.ts/environments.ts already
    // document (CanvasTexture unreliable under happy-dom). Verified instead via real
    // headless-browser Playwright checks against a live app dev server (M2 report).
    for (const def of shapeRegistry.list()) {
      if (def.id === 'svg-extrude') continue;
      const geometry = def.create(shapeRegistry.require(def.id).defaultParameters, {
        registry: { track: () => {} } as never,
      });
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      expect(pos, `shape "${def.id}" has no position attribute`).toBeDefined();
      expect(pos.count, `shape "${def.id}" produced zero vertices`).toBeGreaterThan(0);
      let hasNaN = false;
      for (let i = 0; i < pos.count && !hasNaN; i++) {
        if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) hasNaN = true;
      }
      expect(hasNaN, `shape "${def.id}" produced non-finite vertex positions`).toBe(false);
      geometry.dispose();
    }
  });

  it('registers the neutral symbol set', () => {
    expect(['heart', 'plus', 'arrow', 'star', 'sparkle'].every((id) => shapeRegistry.get(id))).toBe(true);
  });

  it('every default non-SVG shape has usable UVs after the runtime fallback', () => {
    for (const def of shapeRegistry.list()) {
      if (def.id === 'svg-extrude') continue;
      const geometry = def.create(def.defaultParameters, { registry: { track: () => {} } } as never);
      ensureGeometryUVs(geometry);
      const position = geometry.getAttribute('position');
      const uv = geometry.getAttribute('uv');
      expect(uv, `shape "${def.id}" has no UVs`).toBeDefined();
      expect(uv.count).toBe(position.count);
      for (let i = 0; i < uv.count; i++) {
        expect(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i))).toBe(true);
      }
      geometry.dispose();
    }
  });

  it('box defaults to a regular box and builds when rounded', () => {
    const box = shapeRegistry.require('box');
    expect(box.defaultParameters.roundness).toBe(0);
    const ctx = { registry: { track: () => {} } } as never;
    const regular = box.create(box.defaultParameters, ctx);
    const rounded = box.create({ ...box.defaultParameters, roundness: 0.2 }, ctx);
    expect(regular.attributes.position.count).toBeGreaterThan(0);
    expect(rounded.attributes.position.count).toBeGreaterThan(0);
    regular.dispose();
    rounded.dispose();
  });

  it.each(['pill', 'card', 'badge', 'tab', 'notched-card'])('%s defaults to finite, non-empty geometry', (id) => {
    const def = shapeRegistry.require(id);
    const geometry = def.create(def.defaultParameters, { registry: { track: () => {} } } as never);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    expect(position.count).toBeGreaterThan(0);
    for (let i = 0; i < position.count; i++) {
      expect(Number.isFinite(position.getX(i))).toBe(true);
      expect(Number.isFinite(position.getY(i))).toBe(true);
      expect(Number.isFinite(position.getZ(i))).toBe(true);
    }
    geometry.dispose();
  });

  it('every registered material creates without throwing', () => {
    for (const def of materialRegistry.list()) {
      const material = def.create(materialRegistry.require(def.id).defaultParameters, { registry: { track: () => {} } as never });
      expect(material, `material "${def.id}" did not return a THREE.Material`).toBeInstanceOf(THREE.Material);
      material.dispose();
    }
  });

  it('every registered texture creates and disposes from defaults', () => {
    for (const def of textureRegistry.list()) {
      const handle = def.create(def.defaultParameters, { registry: { track: () => {} } as never });
      expect(handle.texture === null || handle.texture instanceof THREE.Texture).toBe(true);
      handle.dispose();
    }
  });

  it('every registered environment and effect creates and disposes from defaults', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    for (const def of environmentRegistry.list()) {
      const handle = def.create(def.defaultParameters, { registry: { track: () => {} } as never, scene });
      handle.dispose();
    }
    for (const def of effectRegistry.list()) {
      const handle = def.create(def.defaultParameters, {
        registry: { track: () => {} } as never,
        scene,
        camera,
        renderer: {} as THREE.WebGLRenderer,
      });
      handle.dispose();
    }
  });
});
