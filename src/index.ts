// Public barrel: types, registries, runtime, serialize/embed, export.
export * from './types.js';
export { TexturePackLoader, loadTexturePack, clearTexturePackCache, resolveTextureUrl, assertTexturePackManifest } from './texture/loader.js';
export type { LoadedTexturePack, TexturePackLoadOptions } from './texture/loader.js';

export { DefinitionRegistry } from './registry/DefinitionRegistry.js';
export { shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry, defineShape, defineMaterial, defineTexture, defineEnvironment, defineEffect } from './registry/instances.js';

export { FormaRuntime } from './runtime/FormaRuntime.js';
export type { FormaRuntimeOptions } from './runtime/FormaRuntime.js';
export { slotKey, changedHotKeys } from './runtime/diff.js';
export { ensureGeometryUVs } from './runtime/uv.js';
export type { SlotName } from './runtime/diff.js';
export { serializeComposition, deserializeComposition } from './runtime/serialize.js';
export { replaceRetiredShape } from './runtime/retiredShapes.js';
export { MATTER_DEFAULTS, parseMatterSettings } from './runtime/matterSettings.js';
export { ATMOSPHERE_DEFAULTS, parseAtmosphereSettings } from './runtime/atmosphereSettings.js';
export { generateEmbedCode, generateStandaloneHtml } from './runtime/embed.js';
export type { EmbedOptions } from './runtime/embed.js';
export { embedForma } from './runtime/embedPlayer.js';
export type { EmbedView, EmbedPlayerOptions, FormaEmbed } from './runtime/embedPlayer.js';

export { exportPNG } from './export/exportPNG.js';

export { createFormaScene } from './scene/createFormaScene.js';
export { ContactShadow, SHADOW_CASTER_LAYER } from './scene/ContactShadow.js';
export type { ContactShadowSettings } from './scene/ContactShadow.js';
export type { CreateFormaSceneOptions, FormaScene } from './scene/createFormaScene.js';
export { computeFraming, applyFraming, DEFAULT_FRAMING_FILL, DEFAULT_SUBJECT_RADIUS } from './scene/framing.js';
export type { Framing, FramingInsets, FramingResult } from './scene/framing.js';
export { FrameScheduler } from 'cc-webgl';

import type { Composition } from './types.js';
import { FormaRuntime } from './runtime/FormaRuntime.js';
import { createFormaScene } from './scene/createFormaScene.js';
import { replaceRetiredShape } from './runtime/retiredShapes.js';

/** Convenience one-shot mount for embed-code consumers (blueprint §5.4's generated
 * snippet calls this). Uses the shared scene bootstrap (`createFormaScene`) — same
 * path the harness uses — and applies `composition` immediately. Disposing the
 * returned runtime also disposes the owned renderer and resize observer. Caller
 * must have already registered referenced content. */
export async function mountForma(el: HTMLElement, composition: Composition): Promise<FormaRuntime> {
  const formaScene = createFormaScene({ el, cameraZ: 3 });
  const { scene, camera, renderer, composer, render } = formaScene;
  const runtime = new FormaRuntime({ scene, camera, renderer, composer, ensureOutputPassLast: formaScene.ensureOutputPassLast, disposeExternal: formaScene.dispose });
  runtime.applyComposition(replaceRetiredShape(composition));
  render();
  return runtime;
}
export { joinPageCurrent } from './bridge/pageBridge.js';
export type { PageBridge, PageBridgeOptions } from './bridge/pageBridge.js';
export { pageCurrent, CURRENT_PRESETS, CURRENT_CURSOR_MODES } from './bridge/current.js';
export type { PageCurrent, CurrentBody, CurrentCursor, CurrentPalette, CurrentField, CurrentMember } from './bridge/current.js';
export type { FlowSampler } from './runtime/MatterLayer.js';
export { composeScene, isLinefieldBake, bakeJoinsCurrent } from './runtime/compose.js';
export type { ComposeOptions } from './runtime/compose.js';
