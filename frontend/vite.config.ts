import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

const frontendDir=path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    root: frontendDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(frontendDir, 'src'),
      },
    },
    build: {
      outDir: path.resolve(frontendDir, '..', 'dist'),
      emptyOutDir: true,
    },
    server: {
      allowedHosts: ['abc-paints-dashboard.onrender.com'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
