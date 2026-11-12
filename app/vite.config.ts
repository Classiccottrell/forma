import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
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
  plugins: [hostEmbedBundle()],
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
