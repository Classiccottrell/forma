import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

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

  it('every registered material creates without throwing', () => {
    for (const def of materialRegistry.list()) {
      const material = def.create(materialRegistry.require(def.id).defaultParameters, { registry: { track: () => {} } as never });
      expect(material, `material "${def.id}" did not return a THREE.Material`).toBeInstanceOf(THREE.Material);
      material.dispose();
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
