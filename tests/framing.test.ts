import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { describe, expect, it } from 'vitest';
import { applyFraming, computeFraming, DEFAULT_FRAMING_FILL, DEFAULT_SUBJECT_RADIUS } from '../src/scene/framing.js';
import { exportPNG } from '../src/export/exportPNG.js';

/** Radius of the subject on screen, in px, as a share of the visible area's half-extent. */
function onScreenFill(camera: THREE.PerspectiveCamera, height: number, visible: number): number {
  camera.updateMatrixWorld();
  const centre = new THREE.Vector3(0, 0, 0).project(camera);
  const right = camera.up.clone().cross(camera.position.clone().negate()).normalize().negate();
  const edge = right.multiplyScalar(DEFAULT_SUBJECT_RADIUS).project(camera);
  // NDC to px: the full canvas height is 2 NDC units vertically; x uses aspect.
  const px = Math.abs(edge.x - centre.x) * (height * camera.aspect) / 2;
  return px / (visible / 2);
}

describe('computeFraming', () => {
  it('puts the subject at the requested fill of the shorter visible side', () => {
    for (const [w, h] of [[1200, 800], [800, 1200], [1024, 1024]]) {
      const camera = new THREE.PerspectiveCamera(50, w / h);
      camera.position.set(0, 0, 3.2);
      applyFraming(camera, new THREE.Vector3(), w, h, computeFraming(50, w, h));
      expect(onScreenFill(camera, h, Math.min(w, h))).toBeCloseTo(DEFAULT_FRAMING_FILL, 2);
    }
  });

  it('frames in the area left of a panel and below a top bar, centred there', () => {
    const w = 1400, h = 900;
    const result = computeFraming(50, w, h, { insets: { right: 360, top: 60 } });
    expect(result.offsetX).toBe(180);
    expect(result.offsetY).toBe(-30);
    const camera = new THREE.PerspectiveCamera(50, w / h);
    camera.position.set(0, 0, 3.2);
    applyFraming(camera, new THREE.Vector3(), w, h, result);
    camera.updateMatrixWorld();
    const centre = new THREE.Vector3().project(camera);
    // Centre of the visible area: x = (1400-360)/2 = 520 px, y = 60 + 840/2 = 480 px from the top.
    expect(((centre.x + 1) / 2) * w).toBeCloseTo(520, 3);
    expect(((1 - centre.y) / 2) * h).toBeCloseTo(480, 3);
    expect(onScreenFill(camera, h, 840)).toBeCloseTo(DEFAULT_FRAMING_FILL, 2);
  });

  it('ignores an inset that would leave almost nothing visible (full-width phone panel)', () => {
    const result = computeFraming(50, 390, 844, { insets: { right: 390 } });
    expect(result.offsetX).toBe(0);
    expect(result).toEqual(computeFraming(50, 390, 844));
  });

  it('keeps the camera direction and the user zoom', () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5);
    camera.position.set(2, 1, 2);
    camera.zoom = 1.7;
    const before = camera.position.clone().normalize();
    applyFraming(camera, new THREE.Vector3(), 1200, 800, computeFraming(50, 1200, 800));
    expect(camera.position.clone().normalize().distanceTo(before)).toBeLessThan(1e-9);
    expect(camera.zoom).toBe(1.7);
    expect(camera.view?.enabled ?? false).toBe(false);
  });
});

describe('exportPNG with framing', () => {
  it('frames the export for its own size with no panel offset, then restores the live view', async () => {
    const camera = new THREE.PerspectiveCamera(50, 1400 / 900);
    camera.position.set(0, 0, 3.2);
    const framing = { insets: { right: 360, top: 60 } };
    applyFraming(camera, new THREE.Vector3(), 1400, 900, computeFraming(50, 1400, 900, framing));
    const livePosition = camera.position.clone();
    let pixelRatio = 1;
    const seen: { distance: number; view: boolean }[] = [];
    const renderer = {
      domElement: { width: 1400, height: 900, toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['png'])) },
      getPixelRatio: () => pixelRatio,
      setPixelRatio: (v: number) => { pixelRatio = v; },
      setSize: (w: number, h: number) => { renderer.domElement.width = w; renderer.domElement.height = h; },
      render: () => undefined,
    } as unknown as THREE.WebGLRenderer;
    const composer = {
      setSize: () => undefined,
      render: () => seen.push({ distance: camera.position.length(), view: camera.view?.enabled ?? false }),
    } as unknown as EffectComposer;

    await exportPNG({ renderer, scene: new THREE.Scene(), camera, composer, framing }, { width: 1024, height: 1024 });

    expect(seen).toHaveLength(1);
    expect(seen[0].view).toBe(false);
    expect(seen[0].distance).toBeCloseTo(computeFraming(50, 1024, 1024).distance, 6);
    expect(camera.position.equals(livePosition)).toBe(true);
    expect(camera.view?.enabled).toBe(true);
    expect(camera.view?.offsetX).toBe(180);
  });
});
