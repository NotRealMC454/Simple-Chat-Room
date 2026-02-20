import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  server: {
    port: 3001,
    proxy: {
      '/uploads': 'http://localhost:3000',
      '/upload': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: '../dist',
  },
});
