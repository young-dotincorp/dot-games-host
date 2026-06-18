import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the drop-in SDK: a self-contained dot-ocean.js (IIFE global `DotOcean`)
// and dot-ocean.mjs (ESM). The game mounts inside a Shadow DOM, so CSS is imported
// as a string (?inline) and injected into the shadow tree — never the host page.
// Fish art is inlined as base64; React is bundled in. No build step for consumers.
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [react()],
  build: {
    outDir: 'dist-sdk',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    lib: {
      entry: 'src/sdk/index.tsx',
      name: 'DotOcean',
      formats: ['iife', 'es'],
      fileName: (format) => (format === 'iife' ? 'dot-ocean.js' : 'dot-ocean.mjs'),
    },
  },
});
