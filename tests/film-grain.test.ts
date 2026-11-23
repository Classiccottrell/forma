import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { effectRegistry } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

describe('film-grain frame clock', () => {
  ensureHarnessContentRegistered();

  function grain(animate: boolean) {
    const def = effectRegistry.require('film-grain');
    const params = { ...def.defaultParameters, animate } as typeof def.defaultParameters;
    const handle = def.create(params, {
      registry: { track: () => {} } as never,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: {} as THREE.WebGLRenderer,
    });
    const pass = handle.pass as unknown as { uniforms: { time: { value: number } } };
    return {
      handle,
      time: () => pass.uniforms.time.value,
      frame: (elapsed: number) => handle.updateFrame?.(0.016, elapsed),
      setAnimate: (on: boolean) => def.update!(handle, { ...params, animate: on } as typeof params),
    };
  }

  it('advances only when the host updates, and clears the time when disabled', () => {
    const g = grain(true);
    g.frame(1.25);
    expect(g.time()).toBe(1.25);
    g.setAnimate(false);
    expect(g.time()).toBe(0);
    g.frame(2);
    expect(g.time()).toBe(0);
    g.handle.dispose();
  });

  it('can be enabled after creation and stops on disposal', () => {
    const g = grain(false);
    g.frame(1);
    expect(g.time()).toBe(0);
    g.setAnimate(true);
    g.frame(2.5);
    expect(g.time()).toBe(2.5);
    g.handle.dispose();
    g.frame(3);
    expect(g.time()).toBe(2.5);
  });
});
