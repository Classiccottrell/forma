import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Product editor app. Consumes `forma` as a published dependent (file:.. in
// package.json — resolves to ../dist at runtime through the real exports map),
// but dev mode aliases straight to ../src so edits to Forma's content/library
// during this same milestone are visible without a rebuild step each time
// (advisor guidance — file:.. still keeps tests/embed.test.ts's published-consumer
// contract meaningful; this alias is dev-only ergonomics, not a substitute for it).
export default defineConfig({
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
