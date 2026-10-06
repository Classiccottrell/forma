import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { FormaRuntime, shapeRegistry, materialRegistry, environmentRegistry, type Composition } from '../src/index.js';
import { makeHeadlessRuntime } from './testUtils.js';

// Compositions exported before environments had parameters carry
// `environmentParams: {}`, and deserializeComposition deliberately accepts that
// ("environment controls use definition defaults for any omitted value"). The
// runtime has to honour it on both paths: creating an environment, and the hot
// update() that runs when the environment id is unchanged.
describe('environment params: omitted values fall back to definition defaults', () => {
  const composition = (environmentParams: Record<string, unknown>): Composition =>
    ({
      shapeId: 'sphere',
      shapeParams: { ...shapeRegistry.require('sphere').defaultParameters },
      materialId: 'matte',
      materialParams: { ...materialRegistry.require('matte').defaultParameters },
      environmentId: 'studio',
      environmentParams,
      effectIds: [],
      effectParams: {},
    }) as Composition;

  const lights = (scene: THREE.Scene): THREE.Light[] => {
    const found: THREE.Light[] = [];
    scene.traverse((o) => {
      if (o instanceof THREE.Light) found.push(o);
    });
    return found;
  };

  it('an older composition applied over the same environment keeps every light finite', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(composition({ ...environmentRegistry.require('studio').defaultParameters }));
    // Same environment id, so this takes the hot update() path, not create().
    runtime.applyComposition(composition({}));
    const found = lights(runtime.scene);
    expect(found.length).toBeGreaterThan(0);
    // Regression: update() multiplied every base intensity by an undefined
    // `lightIntensity`, and a scene lit by NaN renders nothing at all.
    expect(found.every((light) => Number.isFinite(light.intensity))).toBe(true);
    runtime.dispose();
  });

  it('an environment created from empty params places its lights at finite positions', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(composition({}));
    const found = lights(runtime.scene);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((light) => light.position.toArray().every(Number.isFinite))).toBe(true);
    runtime.dispose();
  });
});

describe('environment lighting reflects the composition', () => {
  const composition = (environmentId: string, overrides: Record<string, unknown> = {}): Composition =>
    ({
      shapeId: 'sphere',
      shapeParams: { ...shapeRegistry.require('sphere').defaultParameters },
      materialId: 'matte',
      materialParams: { ...materialRegistry.require('matte').defaultParameters },
      environmentId,
      environmentParams: { ...environmentRegistry.require(environmentId).defaultParameters, ...overrides },
      effectIds: [],
      effectParams: {},
    }) as Composition;

  const lights = (scene: THREE.Scene): THREE.Light[] => {
    const found: THREE.Light[] = [];
    scene.traverse((o) => { if (o instanceof THREE.Light) found.push(o); });
    return found;
  };

  it('applies saved light intensity and colour on the first render, not only after a later edit', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(composition('studio', { lightIntensity: 0, lightColor: '#ff0000' }));
    const found = lights(runtime.scene);
    expect(found.every((light) => light.intensity === 0)).toBe(true);
    expect(found.every((light) => light.color.g === 0 && light.color.b === 0)).toBe(true);
    runtime.dispose();
  });

  it('keeps a themed environment\'s coloured lights under the default white tint', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(composition('neon-room'));
    const before = lights(runtime.scene).map((light) => light.color.getHex());
    // A hot edit used to set every light's colour to `lightColor` outright.
    runtime.applyComposition(composition('neon-room', { lightIntensity: 1.5 }));
    expect(lights(runtime.scene).map((light) => light.color.getHex())).toEqual(before);
    expect(before.some((hex) => hex !== 0xffffff)).toBe(true);
    runtime.dispose();
  });

  it('leaves Aurora\'s violet rim light alone; only the added lamp follows the placement pad', () => {
    const runtime = makeHeadlessRuntime();
    runtime.applyComposition(composition('aurora-atmosphere'));
    const rim = lights(runtime.scene).find((light) => light.color.getHex() === 0x8b7dff)!;
    const rimPosition = rim.position.clone();
    runtime.applyComposition(composition('aurora-atmosphere', { lightX: -1, lightY: 1 }));
    expect(rim.visible).toBe(true);
    expect(rim.position.equals(rimPosition)).toBe(true);
    runtime.dispose();
  });

  it('a finished HDR load uses the strength set while it was loading', () => {
    let finishLoad!: (texture: THREE.Texture) => void;
    const loader = { load: (_url: string, onLoad: (texture: THREE.Texture) => void) => { finishLoad = onLoad; } } as never;
    const fromEquirectangular = vi.spyOn(THREE.PMREMGenerator.prototype, 'fromEquirectangular')
      .mockReturnValue({ texture: new THREE.Texture(), dispose() {} } as never);
    const pmremDispose = vi.spyOn(THREE.PMREMGenerator.prototype, 'dispose').mockImplementation(() => {});
    const runtime = new FormaRuntime({
      scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), renderer: {} as THREE.WebGLRenderer,
      environmentBaseUrl: 'https://assets.test/', environmentLoader: loader,
    });
    runtime.applyComposition(composition('studio', { environmentStrength: 1 }));
    runtime.applyComposition(composition('studio', { environmentStrength: 0.25 }));
    finishLoad(new THREE.Texture());
    expect(runtime.scene.environmentIntensity).toBe(0.25);
    runtime.dispose();
    fromEquirectangular.mockRestore();
    pmremDispose.mockRestore();
  });
});
