import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Dev-only server for the Forma harness. Mirrors cc-webgl/example/vite.config.ts.
export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    dedupe: ['three'],
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
});
