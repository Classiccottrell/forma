import { describe, expect, it } from 'vitest';
import { shapeRegistry } from '../src/index.js';
import { makeHeadlessRuntime } from './testUtils.js';

describe('FormaRuntime shape framing', () => {
  it('normalizes different geometry bounds for the shared viewport', () => {
    const runtime = makeHeadlessRuntime();
    const base = {
      materialId: 'matte', materialParams: { ...shapeRegistry.require('sphere').defaultParameters },
      environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {},
    } as const;

    runtime.applyComposition({
      ...base,
      shapeId: 'sphere',
      shapeParams: { ...shapeRegistry.require('sphere').defaultParameters },
      materialParams: { color: '#7f78ff', roughness: 0.9 },
    });
    const sphereScale = runtime.mesh.scale.x;
    runtime.applyComposition({
      ...base,
      shapeId: 'torus',
      shapeParams: { ...shapeRegistry.require('torus').defaultParameters },
      materialParams: { color: '#7f78ff', roughness: 0.9 },
    });

    expect(Number.isFinite(runtime.mesh.scale.x)).toBe(true);
    expect(runtime.mesh.scale.x).toBeGreaterThan(0);
    expect(Number.isFinite(runtime.mesh.position.x)).toBe(true);
    expect(Math.abs(runtime.mesh.scale.x - sphereScale)).toBeLessThan(0.5);
    runtime.dispose();
  });
});
