import { useEffect, useRef, useState } from 'react';
import {
  FormaRuntime,
  createFormaScene,
  shapeRegistry,
  materialRegistry,
  textureRegistry,
  environmentRegistry,
  type Composition,
  type FormaScene,
  FrameScheduler,
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
    textureId: 'none',
    textureParams: {},
    environmentId: 'studio',
    environmentParams: { ...environmentRegistry.require('studio').defaultParameters },
    effectIds: [],
    effectParams: {},
  };
}

export interface UseFormaRuntimeResult {
  runtime: FormaRuntime | null;
  scene: FormaScene | null;
  scheduler: FrameScheduler | null;
  apply(patch: Partial<Composition>): void;
  current: Composition;
  contextLost: boolean;
}

/** Mounts one `FormaRuntime` + owned scene bootstrap into `hostRef.current` (mount
 * once, per roadmap §6 hook list), exposes an `apply()` that merges a partial patch
 * into the live Composition and re-applies it (React-friendly wrapper). */
export function useFormaRuntime(hostRef: React.RefObject<HTMLElement>, initialComposition = defaultComposition()): UseFormaRuntimeResult {
  const [current, setCurrent] = useState<Composition>(() => initialComposition);
  const [scene, setScene] = useState<FormaScene | null>(null);
  const [scheduler, setScheduler] = useState<FrameScheduler | null>(null);
  const schedulerRef = useRef<FrameScheduler | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const runtimeRef = useRef<FormaRuntime | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    ensureContentRegistered();
    const el = hostRef.current;
    if (!el) return;
    const formaScene = createFormaScene({
      el,
      cameraZ: 3.2,
      onContextLost: () => {
        setContextLost(true);
        schedulerRef.current?.stop();
      },
      onContextRestored: () => {
        setContextLost(false);
        setSceneGeneration((generation) => generation + 1);
      },
    });
    const textureBaseUrl = new URL('textures/', document.baseURI).href;
    const environmentBaseUrl = new URL('environments/', document.baseURI).href;
    const runtime = new FormaRuntime({ scene: formaScene.scene, camera: formaScene.camera, renderer: formaScene.renderer, composer: formaScene.composer, disposeExternal: formaScene.dispose, textureBaseUrl, environmentBaseUrl });
    runtime.applyComposition(currentRef.current);
    runtimeRef.current = runtime;
    setScene(formaScene);

    const scheduler = new FrameScheduler();
    schedulerRef.current = scheduler;
    scheduler.addTask(() => formaScene.render());
    setScheduler(scheduler);
    scheduler.start();

    return () => {
      scheduler.stop();
      schedulerRef.current = null;
      runtime.dispose();
      runtimeRef.current = null;
      setScene(null);
      setScheduler(null);
    };
    // Re-run only after context restore; hostRef's element identity is stable.
  }, [sceneGeneration]);

  function apply(patch: Partial<Composition>): void {
    const next = { ...currentRef.current, ...patch };
    currentRef.current = next;
    setCurrent(next);
    runtimeRef.current?.applyComposition(next);
  }

  return { runtime: runtimeRef.current, scene, scheduler, apply, current, contextLost };
}
