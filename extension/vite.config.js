import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'AgentMonitor',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    outDir: '.',
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'content.js',
        extend: true,
      },
    },
  },
});
