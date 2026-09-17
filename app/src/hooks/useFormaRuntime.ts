import { useEffect, useRef, useState } from 'react';
import {
  FormaRuntime,
  createFormaScene,
  shapeRegistry,
  materialRegistry,
  type Composition,
  type FormaScene,
} from 'forma';
import { registerAllContent } from 'forma/content';

let contentRegistered = false;
function ensureContentRegistered(): void {
  if (contentRegistered) return;
  registerAllContent();
  contentRegistered = true;
}

export function defaultComposition(): Composition {
  ensureContentRegistered();
  return {
    shapeId: 'sphere',
    shapeParams: { ...shapeRegistry.require('sphere').defaultParameters },
    materialId: 'matte',
    materialParams: { ...materialRegistry.require('matte').defaultParameters },
    environmentId: 'studio',
    environmentParams: {},
    effectIds: [],
    effectParams: {},
  };
}

export interface UseFormaRuntimeResult {
  runtime: FormaRuntime | null;
  scene: FormaScene | null;
  apply(patch: Partial<Composition>): void;
  current: Composition;
}

/** Mounts one `FormaRuntime` + owned scene bootstrap into `hostRef.current` (mount
 * once, per roadmap §6 hook list), exposes an `apply()` that merges a partial patch
 * into the live Composition and re-applies it (React-friendly wrapper). */
export function useFormaRuntime(hostRef: React.RefObject<HTMLElement>): UseFormaRuntimeResult {
  const [current, setCurrent] = useState<Composition>(() => defaultComposition());
  const [scene, setScene] = useState<FormaScene | null>(null);
  const runtimeRef = useRef<FormaRuntime | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    ensureContentRegistered();
    const el = hostRef.current;
    if (!el) return;
    const formaScene = createFormaScene({ el, cameraZ: 3.2 });
    const runtime = new FormaRuntime({ scene: formaScene.scene, camera: formaScene.camera, renderer: formaScene.renderer, composer: formaScene.composer });
    runtime.applyComposition(currentRef.current);
    runtimeRef.current = runtime;
    setScene(formaScene);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      formaScene.render();
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      runtime.dispose();
      formaScene.dispose();
      runtimeRef.current = null;
      setScene(null);
    };
    // Mount once — hostRef's element identity is stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(patch: Partial<Composition>): void {
    const next = { ...currentRef.current, ...patch };
    currentRef.current = next;
    setCurrent(next);
    runtimeRef.current?.applyComposition(next);
  }

  return { runtime: runtimeRef.current, scene, apply, current };
}
