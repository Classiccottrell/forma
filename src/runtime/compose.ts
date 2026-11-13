import type { Composition } from '../types.js';
import { generateEmbedCode, inlineSource, type EmbedOptions } from './embed.js';
import type { EmbedView } from './embedPlayer.js';

export interface ComposeOptions extends Omit<EmbedOptions, 'height' | 'view'> {
  /** The Forma view. The backdrop is always transparent in a composed scene; the
   * contact shadow is off unless asked for (there is no floor in a field of lines). */
  view?: EmbedView;
  /** Values to set on the linefield piece over the ones it was baked with (its shared
   * controls and its own: `scale`, `density`, `speed`, …). */
  linefield?: Record<string, number | string | boolean>;
  title?: string;
  /** Source of the browser bundle, to paste into the page instead of linking
   * `libraryUrl`: the result then needs no network for its scripts. */
  inlineLibrary?: string;
}

/** Marks a linefield baked export: the line that carries the values it was baked with. */
const BAKED_VALUES = /window\.__LF_BAKED_VALUES__ = (\{.*?\});\n/;

/** True if a linefield bake carries the page current, so it and the object will react to
 * each other. Older bakes still work as a background; they just don't take part. */
export function bakeJoinsCurrent(html: string): boolean {
  return html.includes('__pageCurrent__');
}

/** True for a linefield "Baked HTML" export, the kind of page `composeScene` builds on. */
export function isLinefieldBake(html: string): boolean {
  return BAKED_VALUES.test(html);
}

/** One page from two: a linefield baked export as the background and a Forma object laid
 * over it, full-viewport and click-through. Both bring a copy of the page current
 * (`bridge/current.js`), so the object's matter rides the background's flow in the
 * background's colours, and the background makes room for the object.
 *
 * `backgroundHtml` must be a linefield baked export (it is a complete page; this returns
 * it with the Forma embed added). Throws if it is not. */
export function composeScene(backgroundHtml: string, composition: Composition, options: ComposeOptions = {}): string {
  if (!isLinefieldBake(backgroundHtml)) throw new Error('composeScene: the background is not a linefield baked export');
  let html = backgroundHtml;
  if (options.linefield && Object.keys(options.linefield).length > 0) {
    html = html.replace(BAKED_VALUES, (_line, json: string) => {
      const values = { ...(JSON.parse(json) as Record<string, unknown>), ...options.linefield };
      return `window.__LF_BAKED_VALUES__ = ${JSON.stringify(values).replace(/</g, '\\u003c')};\n`;
    });
  }
  const view: EmbedView = { shadow: { enabled: false, strength: 0, softness: 0.5 }, ...options.view, backdrop: 'transparent' };
  const { linefield: _linefield, title, inlineLibrary, ...embedOptions } = options;
  let snippet = generateEmbedCode(composition, { ...embedOptions, view, height: '100%' })
    // Full-viewport and click-through: the page pointer reaches both through the current.
    .replace('style="position:relative;width:100%;height:100%"', 'style="position:fixed;inset:0;pointer-events:none;z-index:1" data-forma-composed');
  if (inlineLibrary) snippet = snippet.replace(/<script src="[^"]*"><\/script>/, () => `<script>${inlineSource(inlineLibrary)}</script>`);
  if (title) html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>`);
  const at = html.lastIndexOf('</body>');
  return at === -1 ? `${html}\n${snippet}\n` : `${html.slice(0, at)}${snippet}\n${html.slice(at)}`;
}
