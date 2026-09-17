import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

/**
 * Owned scene bootstrap (expansion roadmap §2 item 1 / §1a). Replaces the two
 * divergent raw-three bootstraps that used to live independently in
 * `harness/main.ts` and `src/index.ts`'s `mountForma`. `cc-webgl`'s contribution to
 * Forma stays narrowed to `ResourceRegistry` only (passed into `FormaRuntime`
 * separately) — this module owns scene/camera/renderer/resize, not `cc-webgl`'s
 * `SceneManager` (see BRIEF.md Constraints for why that path was dropped).
 *
 * Element-sized, not window-sized: both prior bootstraps differed here (harness used
 * `window.innerWidth/Height`; `mountForma` used `el.clientWidth/Height`) — element
 * sizing is correct for both call sites since the harness's canvas host is already an
 * `inset:0` full-viewport div, so `el.clientWidth/Height` covers that case too.
 */
export interface CreateFormaSceneOptions {
  /** Element the renderer's canvas is appended into. */
  el: HTMLElement;
  /** Camera distance from origin along +z. Default 3.2 (harness's prior default). */
  cameraZ?: number;
}

export interface FormaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Shared post-processing composer (M1). Always includes a base RenderPass;
   * effects add/remove their own passes on top. `render()` and `exportPNG` both go
   * through this same composer — the single-render-path guarantee that keeps an
   * active effect from vanishing in PNG export (roadmap §3's `duotone` note). */
  composer: EffectComposer;
  /** Renders one frame through the composer (RenderPass + any active effect passes). */
  render(): void;
  /** Stops observing resize and disposes the renderer + removes its canvas. */
  dispose(): void;
}

export function createFormaScene(opts: CreateFormaSceneOptions): FormaScene {
  const { el, cameraZ = 3.2 } = opts;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, Math.max(el.clientWidth, 1) / Math.max(el.clientHeight, 1), 0.1, 100);
  camera.position.set(0, 0, cameraZ);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearAlpha(0);
  renderer.setSize(Math.max(el.clientWidth, 1), Math.max(el.clientHeight, 1));
  el.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.setSize(Math.max(el.clientWidth, 1), Math.max(el.clientHeight, 1));
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  function resize(): void {
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }

  let observer: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(resize);
    observer.observe(el);
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', resize);
  }

  return {
    scene,
    camera,
    renderer,
    composer,
    render() {
      composer.render();
    },
    dispose() {
      observer?.disconnect();
      if (!observer && typeof window !== 'undefined') window.removeEventListener('resize', resize);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
