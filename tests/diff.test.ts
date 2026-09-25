import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { slotKey } from '../src/index.js';
import { FormaRuntime } from '../src/index.js';
import type { Composition, LoadedTexturePack } from '../src/index.js';
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

  it('keeps texture hot params stable and rebuild params distinct', () => {
    const a = { ...baseComposition(), textureId: 'checker-normal', textureParams: { scale: 4, strength: 0.5 } };
    const hot = { ...a, textureParams: { scale: 4, strength: 1 } };
    const cold = { ...a, textureParams: { scale: 8, strength: 0.5 } };
    expect(slotKey('texture', a)).toBe(slotKey('texture', hot));
    expect(slotKey('texture', a)).not.toBe(slotKey('texture', cold));
  });
});

describe('applyComposition slot decoupling', () => {
  it('does not let a stale texture pack replace the selected pack', async () => {
    const pending: Array<(pack: LoadedTexturePack) => void> = [];
    const loader = { loadTexturePack: () => new Promise<LoadedTexturePack>((resolve) => pending.push(resolve)) };
    const scene = new THREE.Scene();
    const runtime = new FormaRuntime({ scene, camera: new THREE.PerspectiveCamera(), renderer: {} as THREE.WebGLRenderer, textureBaseUrl: '/textures/', textureLoader: loader as never });
    runtime.applyComposition({ ...baseComposition(), textureId: 'linen-blue', textureParams: { scale: 4, intensity: 1 } });
    runtime.applyComposition({ ...baseComposition(), textureId: 'brushed-metal', textureParams: { scale: 4, intensity: 1 } });
    const stale = new THREE.Texture();
    const current = new THREE.Texture();
    let staleDisposed = false;
    pending[0]({ manifest: {} as never, intensity: 1, color: stale, dispose: () => { staleDisposed = true; } });
    await Promise.resolve();
    pending[1]({ manifest: {} as never, intensity: 1, color: current, dispose: () => {} });
    await Promise.resolve();
    expect(staleDisposed).toBe(true);
    expect((runtime.mesh.material as THREE.MeshStandardMaterial).map).toBeNull();
    runtime.dispose();
  });

  it('keeps headless environments on synchronous lights when no HDR base URL is supplied', () => {
    let loads = 0;
    const runtime = new FormaRuntime({
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: {} as THREE.WebGLRenderer,
      environmentLoader: { load: () => { loads++; return {} as never; } },
    });
    runtime.applyComposition(baseComposition());
    expect(loads).toBe(0);
    expect(runtime.scene.environment).toBeNull();
    runtime.dispose();
  });

  it('updates the optional directional light in place', () => {
    const runtime = new FormaRuntime({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), renderer: {} as THREE.WebGLRenderer });
    runtime.applyComposition(baseComposition());
    runtime.applyComposition({
      ...baseComposition(),
      environmentParams: {
        lightingMode: 'directional',
        environmentStrength: 1,
        environmentRotation: 0,
        lightIntensity: 1,
        lightColor: '#ff0000',
        lightX: -0.5,
        lightY: 0.8,
      },
    });
    const lamp = runtime.scene.children.find((child) => child instanceof THREE.DirectionalLight && child.position.z === 2.4) as THREE.DirectionalLight | undefined;
    expect(lamp?.visible).toBe(true);
    expect(lamp?.position.x).toBe(-1);
    expect(lamp?.position.y).toBe(1.6);
    expect(lamp?.color.getHex()).toBe(0xff0000);
    runtime.dispose();
  });

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

  it('isolates and disposes the texture slot', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition({ ...baseComposition(), textureId: 'checker-normal', textureParams: { scale: 4, strength: 0.5 } });
    const textureRegistryBefore = runtime.getSlotRegistry('texture');
    expect(textureRegistryBefore.report().some((entry) => entry.kind === 'texture')).toBe(true);
    runtime.applyComposition({ ...baseComposition(), textureId: 'weave-roughness', textureParams: { scale: 3, contrast: 0.65 } });
    expect(runtime.getSlotRegistry('texture')).not.toBe(textureRegistryBefore);
    runtime.dispose();
    expect(runtime.reportTotal()).toBe(0);
  });
});
