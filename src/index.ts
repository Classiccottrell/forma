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

import type { Composition } from './types.js';
import { FormaRuntime } from './runtime/FormaRuntime.js';
import { createFormaScene } from './scene/createFormaScene.js';

/** Convenience one-shot mount for embed-code consumers (blueprint §5.4's generated
 * snippet calls this). Uses the shared scene bootstrap (`createFormaScene`) — same
 * path the harness uses — and applies `composition` immediately. Not part of the
 * blueprint's literal file list — added so generateEmbedCode's output is directly
 * runnable. Caller must have already registered any content the composition
 * references (see `registerAllContent` from `forma/content`). */
export async function mountForma(el: HTMLElement, composition: Composition): Promise<FormaRuntime> {
  const { scene, camera, renderer, composer, render } = createFormaScene({ el, cameraZ: 3 });
  const runtime = new FormaRuntime({ scene, camera, renderer, composer });
  runtime.applyComposition(composition);
  render();
  return runtime;
}
