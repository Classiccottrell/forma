import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { effectRegistry } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

// `animate` is a hot parameter (rebuild: false), so toggling it goes through
// update() on the live handle rather than recreating the effect. The loop that
// drives the grain clock is owned by create(), so update() has to be able to
// reach it — which it originally could not. Frames are driven by hand here so
// the test decides exactly when the loop gets a chance to run.
describe('film-grain animate toggle', () => {
  ensureHarnessContentRegistered();

  let frames: FrameRequestCallback[] = [];
  let now = 1000;
  const runFrame = (): void => {
    const pending = frames;
    frames = [];
    for (const cb of pending) cb(now);
  };

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
    vi.spyOn(performance, 'now').mockImplementation(() => (now += 16));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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
      setAnimate: (on: boolean) => def.update!(handle, { ...params, animate: on } as typeof params),
    };
  }

  it('switching animation off stops the clock, and it stays stopped', () => {
    const g = grain(true);
    runFrame();
    expect(g.time()).toBeGreaterThan(0);

    g.setAnimate(false);
    expect(g.time()).toBe(0);
    runFrame();
    runFrame();
    // Regression: the loop kept running and overwrote this on the next tick.
    expect(g.time()).toBe(0);
    g.handle.dispose();
  });

  it('switching animation on for grain created static starts the clock', () => {
    const g = grain(false);
    runFrame();
    expect(g.time()).toBe(0);

    g.setAnimate(true);
    runFrame();
    // Regression: no loop was ever started, so this stayed at 0.
    expect(g.time()).toBeGreaterThan(0);
    g.handle.dispose();
  });

  it('dispose stops the loop', () => {
    const g = grain(true);
    g.handle.dispose();
    expect(frames).toHaveLength(0);
  });
});
