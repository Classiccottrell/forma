import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import packageJson from './package.json';

export default defineConfig({
  // cc-webgl is linked from a sibling folder with its own node_modules; without this the
  // bundle can pick up a second copy of three, and passes from one copy break in the other.
  resolve: { dedupe: ['three'] },
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
