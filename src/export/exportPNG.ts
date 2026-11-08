import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { applyFraming, computeFraming, type Framing } from '../scene/framing.js';

export interface ExportPNGTarget {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Shared composer (M1) — when present, export renders through it so active
   * effects (e.g. `duotone`) appear in the exported PNG, not just the live view. */
  composer?: EffectComposer;
  /** The live view's framing (`FormaScene.framing`). When present the export is
   * framed for its own size with no UI insets, so a square PNG keeps the whole object
   * centred instead of inheriting the editor's panel offset and crop. */
  framing?: Framing | null;
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
  const { renderer, scene, camera, composer, framing } = target;
  const { width, height, transparentBackground = true } = opts;

  const prevWidth = renderer.domElement.width;
  const prevHeight = renderer.domElement.height;
  const prevPixelRatio = renderer.getPixelRatio();
  const prevAspect = camera.aspect;
  const prevPosition = camera.position.clone();
  const prevQuaternion = camera.quaternion.clone();
  const prevZoom = camera.zoom;
  const prevBackground = scene.background;
  const prevView = camera.view ? { ...camera.view } : null;

  const targetW = width ?? Math.round(prevWidth / prevPixelRatio);
  const targetH = height ?? Math.round(prevHeight / prevPixelRatio);
  const resizing = targetW !== Math.round(prevWidth / prevPixelRatio) || targetH !== Math.round(prevHeight / prevPixelRatio);

  const restore = () => {
    scene.background = prevBackground;
    renderer.setPixelRatio(prevPixelRatio);
    if (resizing) {
      renderer.setSize(Math.round(prevWidth / prevPixelRatio), Math.round(prevHeight / prevPixelRatio));
      composer?.setSize(Math.round(prevWidth / prevPixelRatio), Math.round(prevHeight / prevPixelRatio));
    }
    camera.position.copy(prevPosition);
    camera.quaternion.copy(prevQuaternion);
    camera.zoom = prevZoom;
    camera.aspect = prevAspect;
    if (prevView?.enabled) camera.setViewOffset(prevView.fullWidth, prevView.fullHeight, prevView.offsetX, prevView.offsetY, prevView.width, prevView.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };

  try {
    if (transparentBackground) scene.background = null;
    if (resizing) {
      renderer.setSize(targetW, targetH);
      composer?.setSize(targetW, targetH);
      camera.aspect = targetW / targetH;
      camera.updateProjectionMatrix();
    }
    if (framing) {
      const { insets: _insets, ...exportFraming } = framing;
      // The orbit target is the origin: FormaRuntime centres every shape there.
      applyFraming(camera, new THREE.Vector3(), targetW, targetH, computeFraming(camera.fov, targetW, targetH, exportFraming));
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);

    const canvas = renderer.domElement;
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          restore();
          if (blob) resolve(blob);
          else reject(new Error('exportPNG: canvas.toBlob returned null'));
        }, 'image/png');
      } catch (error) {
        restore();
        reject(error);
      }
    });
  } catch (error) {
    restore();
    return Promise.reject(error);
  }
}
