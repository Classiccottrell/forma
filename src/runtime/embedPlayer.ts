import * as THREE from 'three';
import type { Composition } from '../types.js';
import { FormaRuntime } from './FormaRuntime.js';
import { replaceRetiredShape } from './retiredShapes.js';
import { createFormaScene, type FormaScene } from '../scene/createFormaScene.js';
import { DEFAULT_FRAMING_FILL } from '../scene/framing.js';
import type { ContactShadowSettings } from '../scene/ContactShadow.js';
import { joinPageCurrent, type PageBridge } from '../bridge/pageBridge.js';

/** How the scene is presented in an embed: the editor's Presentation settings that are
 * not part of the composition itself. Every field is optional. */
export interface EmbedView {
  /** 'transparent' drops the environment's backdrop so the page shows through; the
   * environment still lights and reflects in the object. Default 'environment'. */
  backdrop?: 'environment' | 'transparent';
  /** Camera angle around the object, degrees. Default 0. */
  azimuth?: number;
  /** Camera height angle, degrees, -80..80. Default 0. */
  elevation?: number;
  /** Lens, degrees. Default 50. */
  fov?: number;
  /** Zoom on top of the automatic framing. Default 1. */
  zoom?: number;
  /** Slow turn around the object, degrees per second; 0 is still. Off under reduced motion. */
  spin?: number;
  /** Contact shadow under the object. Default on. */
  shadow?: ContactShadowSettings;
  /** Share of the frame the object takes (see `Framing.fill`). */
  fill?: number;
  /** Where in the element the object sits, 0..1 across and down (see `Framing.anchor`). */
  anchor?: { x: number; y: number };
}

export interface EmbedPlayerOptions {
  view?: EmbedView;
  /** Base URL holding `textures/` and `environments/` (texture packs and the HDRs two
   * environments use). Without it those fall back to their built-in look. */
  assetBase?: string;
  /** Render resolution cap. Default min(devicePixelRatio, 2). */
  maxPixelRatio?: number;
  /** Build only once the element nears the viewport. Default true. */
  lazy?: boolean;
  /** Join the page current, so a linefield background on the same page and this object
   * move together (see `joinPageCurrent`). Costs nothing alone. Default true. */
  current?: boolean;
  /** How far the page's flow carries dispersed matter, in viewport heights. Default 0.9. */
  flowGain?: number;
}

export interface FormaEmbed {
  /** The live runtime once mounted, else null. */
  readonly runtime: FormaRuntime | null;
  /** Resolves once the scene is mounted and has drawn its first frame. */
  readonly ready: Promise<void>;
  /** Stops and restarts the frame loop (on top of the automatic off-screen pause). */
  pause(): void;
  resume(): void;
  dispose(): void;
}

/** Plays a composition in `el`: lazy mount, a frame loop that pauses off-screen and in
 * background tabs, the pointer and scroll triggers, reduced motion, and the editor's view
 * settings. The element sets the size; give it a height. Content must be registered. */
export function embedForma(el: HTMLElement, composition: Composition, options: EmbedPlayerOptions = {}): FormaEmbed {
  const view = options.view ?? {};
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let formaScene: FormaScene | null = null;
  let runtime: FormaRuntime | null = null;
  let bridge: PageBridge | null = null;
  let disposed = false;
  let paused = false;
  let onScreen = typeof IntersectionObserver === 'undefined';
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let spinAngle = THREE.MathUtils.degToRad(view.azimuth ?? 0);
  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {}); // callers that don't await it shouldn't see an unhandled rejection
  const cleanups: (() => void)[] = [];
  const listen = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    target.addEventListener(type, fn as EventListener, { passive: true });
    cleanups.push(() => target.removeEventListener(type, fn as EventListener));
  };

  const placeCamera = (scene: FormaScene) => {
    const elevation = THREE.MathUtils.degToRad(Math.max(-80, Math.min(80, view.elevation ?? 0)));
    const camera = scene.camera;
    const r = Math.max(camera.position.length(), 0.1);
    camera.position.set(r * Math.cos(elevation) * Math.sin(spinAngle), r * Math.sin(elevation), r * Math.cos(elevation) * Math.cos(spinAngle));
    camera.lookAt(0, 0, 0);
  };

  const scrollProgress = (): number => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    return (vh - rect.top) / (vh + rect.height);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!runtime || !formaScene) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;
    if (composition.matter?.motion === 'scroll') runtime.setMatterScroll(scrollProgress());
    if (view.spin && !reducedMotion) {
      spinAngle += THREE.MathUtils.degToRad(view.spin) * dt;
      placeCamera(formaScene);
    }
    bridge?.step();
    runtime.update(dt, elapsed);
    formaScene.render();
    schedule();
  };

  const running = () => !!runtime && !paused && onScreen && !disposed && !(typeof document !== 'undefined' && document.hidden) && !formaScene?.contextLost;
  const schedule = () => {
    if (raf || !running()) return;
    raf = requestAnimationFrame(frame);
  };
  const halt = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const wake = () => {
    if (raf || !running()) return;
    last = performance.now(); // no catch-up jump after a pause
    schedule();
  };

  const mount = () => {
    if (formaScene || disposed) return;
    try {
      formaScene = createFormaScene({
        el,
        framing: { fill: view.fill ?? DEFAULT_FRAMING_FILL, anchor: view.anchor },
        pixelRatio: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, options.maxPixelRatio ?? 2),
        onContextLost: halt,
        onContextRestored: () => { remount(); },
      });
    } catch (error) {
      el.dataset.formaError = 'webgl';
      rejectReady(error);
      return;
    }
    const base = options.assetBase;
    runtime = new FormaRuntime({
      scene: formaScene.scene, camera: formaScene.camera, renderer: formaScene.renderer, composer: formaScene.composer,
      ensureOutputPassLast: formaScene.ensureOutputPassLast, disposeExternal: formaScene.dispose,
      textureBaseUrl: base ? new URL('textures/', base).href : undefined,
      environmentBaseUrl: base ? new URL('environments/', base).href : undefined,
    });
    runtime.applyComposition(replaceRetiredShape(composition));
    runtime.setContactShadow(view.shadow ?? { enabled: true, strength: 0.45, softness: 0.5 });
    // The environment has built its reflections and haze tint from the backdrop by now,
    // so dropping it keeps the object lit as in the editor.
    if (view.backdrop === 'transparent') formaScene.scene.background = null;
    const camera = formaScene.camera;
    camera.fov = view.fov ?? 50;
    camera.zoom = view.zoom ?? 1;
    camera.updateProjectionMatrix();
    formaScene.reframe();
    placeCamera(formaScene);
    if (options.current !== false) {
      bridge = joinPageCurrent({ el, camera, runtime, matter: () => composition.matter, flowGain: options.flowGain });
      bridge.step();
    }
    el.dataset.formaReady = '';
    runtime.update(0, elapsed);
    formaScene.render();
    resolveReady();
    wake();
  };

  const unmount = () => {
    halt();
    bridge?.dispose();
    bridge = null;
    runtime?.dispose(); // also disposes the scene it was given
    runtime = null;
    formaScene = null;
  };
  const remount = () => {
    unmount();
    mount();
  };

  // Pointer: the matter cursor and the Near/Over triggers.
  listen(el, 'pointermove', (event) => {
    const rect = el.getBoundingClientRect();
    runtime?.setMatterPointer({ x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: -((event.clientY - rect.top) / rect.height) * 2 + 1 });
  });
  listen(el, 'pointerleave', () => runtime?.setMatterPointer(null));

  if (typeof document !== 'undefined') {
    const onVisibility = () => (document.hidden ? halt() : wake());
    document.addEventListener('visibilitychange', onVisibility);
    cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  if (typeof IntersectionObserver !== 'undefined') {
    // One observer with a margin: mounts a little before the element scrolls in, and runs
    // the loop only while some of it is near the screen.
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]!.isIntersecting;
      if (onScreen) {
        mount();
        wake();
      } else {
        halt();
      }
    }, { rootMargin: '200px 0px' });
    observer.observe(el);
    cleanups.push(() => observer.disconnect());
  }
  if (options.lazy === false || typeof IntersectionObserver === 'undefined') mount();

  return {
    get runtime() { return runtime; },
    ready,
    pause() { paused = true; halt(); },
    resume() { paused = false; wake(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups.splice(0)) cleanup();
      unmount();
      delete el.dataset.formaReady;
    },
  };
}
