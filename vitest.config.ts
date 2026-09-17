import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    dedupe: ['three'],
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
