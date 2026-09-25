import type { Composition } from '../types.js';
import { serializeComposition } from './serialize.js';

/** Plain-browser embed using the bundled IIFE output. */
export interface EmbedOptions {
  libraryUrl?: string;
}

export function generateEmbedCode(c: Composition, options: EmbedOptions = {}): string {
  const json = serializeComposition(c);
  const libraryUrl = escapeAttribute(options.libraryUrl ?? './forma.browser.v0.1.0.js');
  return `<div id="forma-mount"></div>
<script src="${libraryUrl}"></script>
<script>
  Forma.registerAllContent();
  const composition = ${json};
  Forma.mountForma(document.getElementById('forma-mount'), composition);
</script>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
