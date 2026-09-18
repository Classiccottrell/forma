import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
      name: 'Forma',
      formats: ['iife'],
      fileName: () => 'forma.browser.js',
    },
    outDir: 'dist',
    sourcemap: true,
  },
});
