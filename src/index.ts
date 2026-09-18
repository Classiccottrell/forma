// Public barrel: types, registries, runtime, serialize/embed, export.
export * from './types.js';

export { DefinitionRegistry } from './registry/DefinitionRegistry.js';
export { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry, defineShape, defineMaterial, defineEnvironment, defineEffect } from './registry/instances.js';

export { FormaRuntime } from './runtime/FormaRuntime.js';
export type { FormaRuntimeOptions } from './runtime/FormaRuntime.js';
export { slotKey, changedHotKeys } from './runtime/diff.js';
export type { SlotName } from './runtime/diff.js';
export { serializeComposition, deserializeComposition } from './runtime/serialize.js';
export { generateEmbedCode } from './runtime/embed.js';

export { exportPNG } from './export/exportPNG.js';

export { createFormaScene } from './scene/createFormaScene.js';
export type { CreateFormaSceneOptions, FormaScene } from './scene/createFormaScene.js';
export { FrameScheduler } from 'cc-webgl';

import type { Composition } from './types.js';
import { FormaRuntime } from './runtime/FormaRuntime.js';
import { createFormaScene } from './scene/createFormaScene.js';

/** Convenience one-shot mount for embed-code consumers (blueprint §5.4's generated
 * snippet calls this). Uses the shared scene bootstrap (`createFormaScene`) — same
 * path the harness uses — and applies `composition` immediately. Disposing the
 * returned runtime also disposes the owned renderer and resize observer. Caller
 * must have already registered referenced content. */
export async function mountForma(el: HTMLElement, composition: Composition): Promise<FormaRuntime> {
  const formaScene = createFormaScene({ el, cameraZ: 3 });
  const { scene, camera, renderer, composer, render } = formaScene;
  const runtime = new FormaRuntime({ scene, camera, renderer, composer, disposeExternal: formaScene.dispose });
  runtime.applyComposition(composition);
  render();
  return runtime;
}
