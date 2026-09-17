import type * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

export interface ExportPNGTarget {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Shared composer (M1) — when present, export renders through it so active
   * effects (e.g. `duotone`) appear in the exported PNG, not just the live view. */
  composer?: EffectComposer;
}

export interface ExportPNGOptions {
  /** Target capture size in px. Omit either to keep the renderer's current size on
   * that axis. Roadmap §2 item 6. */
  width?: number;
  height?: number;
  /** Nulls `scene.background` for the capture, then restores it. Default true —
   * "transparent PNG export" is the headline feature; without this, compositions
   * using a solid-color environment (e.g. `studio`) export opaque. */
  transparentBackground?: boolean;
}

/**
 * Transparent PNG export (blueprint §5.4, M1 rewire per roadmap §2 item 5/6).
 *
 * Renders through the same composer the live loop uses (`target.composer`, if
 * provided) — the single-render-path guarantee that keeps effects from vanishing in
 * export. Falls back to a plain `renderer.render()` when no composer is supplied
 * (e.g. a caller still on the pre-M1 signature shape).
 *
 * Deviation from the blueprint's literal mechanism ("enqueue a one-shot FrameTask on
 * SceneManager's FrameScheduler"): `SceneManager` exposes no scheduler accessor, so
 * that exact call is not reachable without a cc-webgl edit, out of scope here.
 * Instead: render and call `canvas.toBlob` in the same synchronous block — `toBlob`
 * snapshots the current drawing-buffer bitmap synchronously at call time (encoding is
 * async, off the snapshot); two statements in one synchronous block with no await
 * between them guarantees nothing composites/clears in between.
 */
export function exportPNG(target: ExportPNGTarget, opts: ExportPNGOptions = {}): Promise<Blob> {
  const { renderer, scene, camera, composer } = target;
  const { width, height, transparentBackground = true } = opts;

  const prevWidth = renderer.domElement.width;
  const prevHeight = renderer.domElement.height;
  const prevPixelRatio = renderer.getPixelRatio();
  const prevAspect = camera.aspect;
  const prevBackground = scene.background;

  const targetW = width ?? Math.round(prevWidth / prevPixelRatio);
  const targetH = height ?? Math.round(prevHeight / prevPixelRatio);
  const resizing = targetW !== Math.round(prevWidth / prevPixelRatio) || targetH !== Math.round(prevHeight / prevPixelRatio);

  if (transparentBackground) scene.background = null;
  if (resizing) {
    renderer.setSize(targetW, targetH);
    composer?.setSize(targetW, targetH);
    camera.aspect = targetW / targetH;
    camera.updateProjectionMatrix();
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);

  const canvas = renderer.domElement;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      // Restore live state regardless of outcome.
      if (transparentBackground) scene.background = prevBackground;
      if (resizing) {
        renderer.setSize(Math.round(prevWidth / prevPixelRatio), Math.round(prevHeight / prevPixelRatio));
        composer?.setSize(Math.round(prevWidth / prevPixelRatio), Math.round(prevHeight / prevPixelRatio));
        camera.aspect = prevAspect;
        camera.updateProjectionMatrix();
      }
      if (blob) resolve(blob);
      else reject(new Error('exportPNG: canvas.toBlob returned null'));
    }, 'image/png');
  });
}
