import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(dirname, 'client'),
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(dirname, 'shared'),
      '@': path.resolve(dirname, 'client/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: [path.resolve(dirname)],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(dirname, 'dist/client'),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
