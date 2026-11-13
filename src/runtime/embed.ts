import type { Composition } from '../types.js';
import { serializeComposition } from './serialize.js';
import type { EmbedView } from './embedPlayer.js';

export interface EmbedOptions {
  /** URL of the browser bundle (`forma.browser.v*.js`). The editor passes the copy it
   * hosts; the default is a file next to the page. */
  libraryUrl?: string;
  /** Base URL holding `textures/` and `environments/`. */
  assetBase?: string;
  view?: EmbedView;
  /** CSS height of the embed box. Default '480px'; width is always 100%. */
  height?: string;
  /** Element id. Default derived from the composition, so two embeds on one page differ. */
  id?: string;
}

/** A paste-anywhere snippet: a sized box, the hosted browser bundle, and one call to
 * `Forma.embed` with the composition and view inlined. */
export function generateEmbedCode(c: Composition, options: EmbedOptions = {}): string {
  const json = escapeForInlineScript(serializeComposition(c));
  const libraryUrl = escapeAttribute(options.libraryUrl ?? './forma.browser.v0.1.0.js');
  const settings: Record<string, unknown> = {};
  if (options.view && Object.keys(options.view).length > 0) settings.view = options.view;
  if (options.assetBase) settings.assetBase = options.assetBase;
  const id = escapeAttribute(options.id ?? `forma-${hash(json)}`);
  const height = escapeAttribute(options.height ?? '480px');
  const settingsArg = Object.keys(settings).length > 0 ? `, ${escapeForInlineScript(JSON.stringify(settings))}` : '';
  return `<div id="${id}" style="position:relative;width:100%;height:${height}"></div>
<script src="${libraryUrl}"></script>
<script>
  Forma.embed(document.getElementById('${id}'), ${json}${settingsArg});
</script>`;
}

/** A complete page around the embed, for "Download HTML": opens on its own, or drops into
 * a site as is. With `inlineLibrary` the bundle source is pasted in, so it needs no
 * network for the script (texture packs and HDRs still load from `assetBase`). */
export function generateStandaloneHtml(c: Composition, options: EmbedOptions & { title?: string; inlineLibrary?: string; background?: string } = {}): string {
  const snippet = generateEmbedCode(c, { ...options, height: options.height ?? '100vh' });
  const library = options.inlineLibrary
    ? snippet.replace(/<script src="[^"]*"><\/script>/, () => `<script>${inlineSource(options.inlineLibrary!)}</script>`)
    : snippet;
  // A scroll-triggered scene needs a page that scrolls, or it sits frozen mid-pass.
  const scrolls = c.matter?.motion === 'scroll';
  const body = scrolls
    ? `<div class="forma-scroll-room"><span>Scroll</span></div>\n${library}\n<div class="forma-scroll-room"></div>`
    : library;
  const title = escapeText(options.title ?? 'Forma scene');
  const background = /^#[0-9a-f]{3,8}$/i.test(options.background ?? '') ? options.background : '#0e0d14';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>html,body{margin:0;height:100%;background:${background}}${scrolls ? '.forma-scroll-room{height:100vh;display:grid;place-items:end center;padding-bottom:24px;box-sizing:border-box;font:12px/1 ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:#8a86a0}' : ''}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/** Bundle source made safe to paste inside <script>: no closing tag, and no source-map
 * comment pointing at a .map file that isn't next to the page. */
function inlineSource(source: string): string {
  return source.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n').replace(/<\/script/gi, '<\\/script');
}

/** The JSON is pasted into an inline <script>, where a string value containing
 * `</script>` would close the element and run what follows. `<` only occurs inside JSON
 * strings, so its \u003c escape parses back to the same value; U+2028/2029 are escaped
 * for pre-ES2019 parsers. */
function escapeForInlineScript(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
