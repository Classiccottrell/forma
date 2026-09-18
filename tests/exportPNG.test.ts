import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { describe, expect, it } from 'vitest';
import { exportPNG } from '../src/export/exportPNG.js';

function makeTarget(blob: Blob | null) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 2);
  camera.position.set(1, 2, 4);
  const originalBackground = new THREE.Color(0x334455);
  scene.background = originalBackground;
  let pixelRatio = 2;
  const renderer = {
    domElement: {
      width: 200,
      height: 100,
      toBlob(callback: (value: Blob | null) => void) {
        callback(blob);
      },
    },
    getPixelRatio: () => pixelRatio,
    setPixelRatio: (value: number) => { pixelRatio = value; },
    setSize: (width: number, height: number) => {
      renderer.domElement.width = width * pixelRatio;
      renderer.domElement.height = height * pixelRatio;
    },
    render: () => undefined,
  } as unknown as THREE.WebGLRenderer;
  const sizes: Array<[number, number]> = [];
  const composer = {
    setSize: (width: number, height: number) => sizes.push([width, height]),
    render: () => undefined,
  } as unknown as EffectComposer;
  return { target: { renderer, scene, camera, composer }, originalBackground, sizes, camera };
}

describe('exportPNG state restoration', () => {
  it('restores renderer, composer, camera, and background after success', async () => {
    const { target, originalBackground, sizes, camera } = makeTarget(new Blob(['png']));
    const originalPosition = camera.position.clone();
    const originalAspect = camera.aspect;

    await exportPNG(target, { width: 320, height: 240 });

    expect(target.renderer.domElement.width).toBe(200);
    expect(target.renderer.domElement.height).toBe(100);
    expect(target.renderer.getPixelRatio()).toBe(2);
    expect(sizes).toEqual([[320, 240], [100, 50]]);
    expect(camera.position.equals(originalPosition)).toBe(true);
    expect(camera.aspect).toBe(originalAspect);
    expect(target.scene.background).toBe(originalBackground);
  });

  it('restores state when canvas encoding fails', async () => {
    const { target, originalBackground, sizes, camera } = makeTarget(null);
    const originalAspect = camera.aspect;

    await expect(exportPNG(target, { width: 320, height: 240 })).rejects.toThrow('toBlob returned null');

    expect(target.renderer.domElement.width).toBe(200);
    expect(target.renderer.domElement.height).toBe(100);
    expect(sizes).toEqual([[320, 240], [100, 50]]);
    expect(camera.aspect).toBe(originalAspect);
    expect(target.scene.background).toBe(originalBackground);
  });
});
