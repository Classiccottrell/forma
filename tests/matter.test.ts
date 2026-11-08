import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  FormaRuntime, serializeComposition, deserializeComposition, parseMatterSettings, MATTER_DEFAULTS,
  shapeRegistry, materialRegistry, environmentRegistry, type Composition, type MatterSettings,
} from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

ensureHarnessContentRegistered();

function composition(shapeId = 'sphere', matter?: MatterSettings): Composition {
  return {
    shapeId,
    shapeParams: { ...shapeRegistry.require(shapeId).defaultParameters },
    materialId: 'matte',
    materialParams: { ...materialRegistry.require('matte').defaultParameters },
    textureId: 'none',
    textureParams: {},
    environmentId: 'studio',
    environmentParams: { ...environmentRegistry.require('studio').defaultParameters },
    effectIds: [],
    effectParams: {},
    ...(matter ? { matter } : {}),
  };
}

/** Headless runtime whose renderer answers the size questions the matter layer asks. */
function matterRuntime(): FormaRuntime {
  const renderer = {
    getSize: (v: THREE.Vector2) => v.set(800, 600),
    getDrawingBufferSize: (v: THREE.Vector2) => v.set(800, 600),
    getPixelRatio: () => 1,
  } as unknown as THREE.WebGLRenderer;
  return new FormaRuntime({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 100), renderer });
}

const low = (patch: Partial<MatterSettings> = {}): MatterSettings => ({ ...MATTER_DEFAULTS, density: 'low', ...patch });

describe('matter settings in saved compositions', () => {
  it('round-trips, and a composition without matter stays without it', () => {
    const withMatter = composition('sphere', low({ form: 'liquid', disperse: 0.4, cursor: 'wake' }));
    expect(deserializeComposition(serializeComposition(withMatter)).matter).toEqual(withMatter.matter);
    expect(deserializeComposition(serializeComposition(composition())).matter).toBeUndefined();
  });

  it('fills settings a file leaves out with defaults', () => {
    expect(parseMatterSettings({ form: 'gas' })).toEqual({ ...MATTER_DEFAULTS, form: 'gas' });
  });

  it.each([
    [{ form: 'plasma' }, /form must be one of/],
    [{ disperse: 2 }, /disperse must be a number from 0 to 1/],
    [{ radius: 0 }, /radius must be a number/],
    [{ cursor: 3 }, /cursor must be one of/],
    [{ glow: 1 }, /glow is not a matter setting/],
    [[], /must be an object/],
  ])('rejects %j', (matter, message) => {
    const s = JSON.stringify({ ...composition(), matter });
    expect(() => deserializeComposition(s)).toThrow(message);
  });
});

describe('matter layer', () => {
  it('draws nothing and leaves the mesh alone while the composition has no matter', () => {
    const runtime = matterRuntime();
    runtime.applyComposition(composition());
    runtime.updateMatter(1 / 60, 0);
    const points = runtime.scene.children.find((o) => o instanceof THREE.Points)!;
    expect(points.visible).toBe(false);
    expect(runtime.mesh.visible).toBe(true);
    runtime.dispose();
  });

  it('cracks the solid surface away as it disperses, and restores it when matter is turned off', () => {
    const runtime = matterRuntime();
    runtime.applyComposition(composition('sphere', low({ disperse: 0 })));
    runtime.updateMatter(1 / 60, 0);
    expect(runtime.mesh.visible).toBe(true);
    runtime.applyComposition(composition('sphere', low({ disperse: 0.5 })));
    runtime.updateMatter(1 / 60, 0.1);
    expect(runtime.mesh.visible).toBe(false);
    runtime.applyComposition(composition());
    expect(runtime.mesh.visible).toBe(true);
    runtime.dispose();
  });

  it('has no surface in Gas, which it appears in directly rather than easing from Solid', () => {
    const runtime = matterRuntime();
    runtime.applyComposition(composition('sphere', low({ form: 'gas' })));
    runtime.updateMatter(1 / 60, 0);
    expect(runtime.mesh.visible).toBe(false);
    runtime.dispose();
  });

  it('removes its particles from the scene on dispose', () => {
    const runtime = matterRuntime();
    runtime.applyComposition(composition('sphere', low()));
    runtime.updateMatter(1 / 60, 0);
    runtime.dispose();
    expect(runtime.scene.children.some((o) => o instanceof THREE.Points)).toBe(false);
  });

  // Every shape (svg-extrude needs a real DOMParser, as in the content smoke test).
  const shapeIds = shapeRegistry.list().map((d) => d.id).filter((id) => id !== 'svg-extrude');
  it.each(shapeIds)('%s: particles are finite and stay inside the shape', (shapeId) => {
    const runtime = matterRuntime();
    runtime.applyComposition(composition(shapeId, low()));
    runtime.updateMatter(1 / 60, 0);
    const g = runtime.getMatterGeometry();
    const pos = g.getAttribute('position');
    expect(pos.count).toBeGreaterThan(0);
    // Unit space: the shape's bounding sphere has radius 1, so nothing may sit outside it.
    const box = new THREE.Box3();
    const geometry = runtime.mesh.geometry;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const { center, radius } = geometry.boundingSphere!;
    box.copy(geometry.boundingBox!).translate(center.clone().negate());
    box.min.divideScalar(radius); box.max.divideScalar(radius);
    box.expandByScalar(1e-3);
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      // The inside fill must not poke out through the back of flat and thin shapes.
      if (!box.containsPoint(p)) throw new Error(`${shapeId}: particle ${i} outside the shape's bounds at ${p.toArray()}`);
    }
    runtime.dispose();
  }, 30_000);
});
