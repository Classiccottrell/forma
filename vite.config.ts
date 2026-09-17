import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Lib mode, single entry (blueprint §6: no ./react subpath in pre-work scope).
export default defineConfig({
  resolve: {
    dedupe: ['three'],
  },
  build: {
    // tsc --emitDeclarationOnly runs before vite build (package.json "build" script);
    // default emptyOutDir would wipe the .d.ts files tsc just wrote into dist/.
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'content/index': resolve(__dirname, 'src/content/index.ts'),
      },
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: (id) => id === 'three' || id.startsWith('three/') || id === 'cc-webgl',
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
