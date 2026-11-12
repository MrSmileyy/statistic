import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base path ensures asset URLs resolve cleanly under any GitHub Pages subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: {
    format: 'es',
  },
});

