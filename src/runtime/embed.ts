import type { Composition } from '../types.js';
import { serializeComposition } from './serialize.js';

/** Plain-browser embed using the bundled IIFE output. */
export interface EmbedOptions {
  libraryUrl?: string;
}

export function generateEmbedCode(c: Composition, options: EmbedOptions = {}): string {
  const json = escapeForInlineScript(serializeComposition(c));
  const libraryUrl = escapeAttribute(options.libraryUrl ?? './forma.browser.v0.1.0.js');
  return `<div id="forma-mount"></div>
<script src="${libraryUrl}"></script>
<script>
  Forma.registerAllContent();
  const composition = ${json};
  Forma.mountForma(document.getElementById('forma-mount'), composition);
</script>`;
}

/** The JSON is pasted into an inline <script>, where a string value containing
 * `</script>` (an imported SVG param, say) would close the element and run what
 * follows. `<` only occurs inside JSON strings, so its \u003c escape parses back
 * to the same value; U+2028/2029 are escaped for pre-ES2019 parsers. */
function escapeForInlineScript(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
