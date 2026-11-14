import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const formaVersion: string = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8')).version;

/** Hosts Forma's browser bundle next to the app, so copied embed code points at a real
 * file: `embed/forma.v<version>.js` (what the snippet uses; stays put across releases)
 * and `embed/forma.js` (always the latest). Read from the library build (`npm run build`
 * at the repo root), in dev as well as in the built site. */
function hostEmbedBundle(): Plugin {
  const source = () => readFileSync(resolve(__dirname, `../dist/forma.browser.v${formaVersion}.js`));
  return {
    name: 'forma-embed-bundle',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!/\/embed\/forma(\.v[\d.]+)?\.js(\?.*)?$/.test(req.url ?? '')) return next();
        res.setHeader('Content-Type', 'text/javascript');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(source());
      });
    },
    generateBundle() {
      const code = source();
      this.emitFile({ type: 'asset', fileName: `embed/forma.v${formaVersion}.js`, source: code });
      this.emitFile({ type: 'asset', fileName: 'embed/forma.js', source: code });
    },
  };
}

interface ScenePage { id: string; name: string; blurb: string; piece: string; html: string }

/** Builds the composed showcase scenes as real pages, `scenes/<id>.html`: a linefield
 * piece behind a Forma object, made with the same `composeScene` the export menu uses.
 * The homepage plays them in its hero, and each is a page to link to on its own.
 *
 * The linefield bakes are vendored in `app/linefield/` (copies of
 * https://classiccottrell.github.io/linefield/downloads/<piece>.html; refresh them by
 * downloading again). The scene pages link the hosted bundle next to them, so the
 * library build must exist, as for `hostEmbedBundle`.
 *
 * `virtual:forma-scenes` gives the homepage the scenes' names and blurbs without it
 * importing the library (and with it three.js). */
function composedScenePages(): Plugin {
  const VIRTUAL = 'virtual:forma-scenes';
  let pages: Promise<ScenePage[]> | null = null;
  const build = async (): Promise<ScenePage[]> => {
    const dist = (file: string) => import(/* @vite-ignore */ pathToFileURL(resolve(__dirname, '../dist', file)).href);
    const content = await dist('content/index.js');
    const { composeScene } = await dist('runtime/compose.js');
    content.registerAllContent();
    return content.composedScenes().map((scene: { id: string; name: string; blurb: string; piece: string; linefield: Record<string, unknown>; composition: unknown; view: unknown; flowGain: number }) => {
      const bake = readFileSync(resolve(__dirname, 'linefield', `${scene.piece}.html`), 'utf-8');
      const html = composeScene(bake, scene.composition, {
        libraryUrl: `../embed/forma.v${formaVersion}.js`,
        assetBase: '../',
        view: scene.view,
        linefield: scene.linefield,
        flowGain: scene.flowGain,
        title: `${scene.name} · Forma`,
      });
      // Without its own icon a scene page asks the site root for one, which 404s on a project site.
      const page = html.replace('</head>', '<link rel="icon" type="image/svg+xml" href="../favicon.svg">\n</head>');
      return { id: scene.id, name: scene.name, blurb: scene.blurb, piece: content.LINEFIELD_PIECES[scene.piece].title, html: page };
    });
  };
  const get = () => (pages ??= build());
  return {
    name: 'forma-composed-scenes',
    resolveId(id) {
      return id === VIRTUAL ? `\0${VIRTUAL}` : null;
    },
    async load(id) {
      if (id !== `\0${VIRTUAL}`) return null;
      const meta = (await get()).map(({ html: _html, ...scene }) => scene);
      return `export const scenes = ${JSON.stringify(meta)};`;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = /\/scenes\/([a-z0-9-]+)\.html(\?.*)?$/.exec(req.url ?? '');
        const page = match && (await get()).find((scene) => scene.id === match[1]);
        if (!page) return next();
        res.setHeader('Content-Type', 'text/html');
        res.end(page.html);
      });
    },
    async generateBundle() {
      for (const page of await get()) this.emitFile({ type: 'asset', fileName: `scenes/${page.id}.html`, source: page.html });
    },
  };
}

// Product editor app. Consumes `forma` as a published dependent (file:.. in
// package.json — resolves to ../dist at runtime through the real exports map),
// but dev mode aliases straight to ../src so edits to Forma's content/library
// during this same milestone are visible without a rebuild step each time
// (advisor guidance — file:.. still keeps tests/embed.test.ts's published-consumer
// contract meaningful; this alias is dev-only ergonomics, not a substitute for it).
export default defineConfig({
  // GitHub Pages project sites are served from https://<user>.github.io/<repo>/,
  // so asset URLs need a `/<repo>/` base — Cloudflare Pages/Vercel serve from the
  // domain root and want '/' (the default). Set FORMA_BASE at build time; see
  // app/README.md's deployment section for exact per-host commands.
  base: process.env.FORMA_BASE ?? '/',
  plugins: [hostEmbedBundle(), composedScenePages()],
  define: { __FORMA_VERSION__: JSON.stringify(formaVersion) },
  resolve: {
    dedupe: ['three'],
    alias:
      process.env.NODE_ENV === 'development'
        ? [
            { find: 'forma/content', replacement: resolve(__dirname, '../src/content/index.ts') },
            { find: 'forma', replacement: resolve(__dirname, '../src/index.ts') },
          ]
        : [],
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
});
