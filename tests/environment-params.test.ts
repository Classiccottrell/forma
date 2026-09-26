import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { shapeRegistry, materialRegistry, environmentRegistry, type Composition } from '../src/index.js';
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
