import { registerShapes } from './shapes.js';
import { registerMaterials } from './materials.js';
import { registerTextures } from './textures.js';
import { registerEnvironments } from './environments.js';
import { registerEffects } from './effects.js';

export { registerShapes } from './shapes.js';
export { registerMaterials } from './materials.js';
export { registerTextures } from './textures.js';
export { registerEnvironments } from './environments.js';
export { registerEffects } from './effects.js';
export { builtInPresets } from './presets.js';
export { surpriseMe } from './surpriseMe.js';
export { texturePackCatalog } from './texturePacks.js';
export type { TexturePackCatalogEntry } from './texturePacks.js';

/** Registers the MVP starter content set (shapes / materials / textures / environments /
 * 1 stub effect) into the four shared registry singletons. Explicit call, not an
 * import-time side effect — `package.json`'s `"sideEffects": false` means a bundler
 * is free to drop a module that only runs code at import scope; a real consumer
 * (embed-code snippet, harness, future `app/`) must call this itself. */
export function registerAllContent(): void {
  registerShapes();
  registerMaterials();
  registerTextures();
  registerEnvironments();
  registerEffects();
}
