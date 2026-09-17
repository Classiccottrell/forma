import type { Composition } from '../types.js';
import { serializeComposition } from './serialize.js';

/** Pure string template (blueprint §5.4) — no live DOM/build step. */
export function generateEmbedCode(c: Composition): string {
  const json = serializeComposition(c);
  return `<div id="forma-mount"></div>
<script type="module">
  import { mountForma } from 'forma';
  import { registerAllContent } from 'forma/content';

  registerAllContent(); // registers shapes/materials/environments/effects used below
  const composition = ${json};
  mountForma(document.getElementById('forma-mount'), composition);
</script>`;
}
