import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import packageJson from './package.json';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
      name: 'Forma',
      formats: ['iife'],
      fileName: () => 'forma.browser.v' + packageJson.version + '.js',
    },
    outDir: 'dist',
    sourcemap: true,
  },
});
