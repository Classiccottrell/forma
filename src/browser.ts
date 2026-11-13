import type { Composition } from './types.js';
import { mountForma } from './index.js';
import { registerAllContent } from './content/index.js';
import { embedForma, type EmbedPlayerOptions, type FormaEmbed } from './runtime/embedPlayer.js';
import { parseMatterSettings } from './runtime/matterSettings.js';

/** The browser bundle's entry (`window.Forma`). `embed` registers the built-in content
 * itself, so a pasted snippet needs this one call. */
function embed(el: HTMLElement | null, composition: Composition, options?: EmbedPlayerOptions): FormaEmbed | null {
  if (!el) {
    console.warn('Forma.embed: no element to mount into');
    return null;
  }
  registerAllContent();
  return embedForma(el, composition, options);
}

export { embed, embedForma, mountForma, registerAllContent, parseMatterSettings };
