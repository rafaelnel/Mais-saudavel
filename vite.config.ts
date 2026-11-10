import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'github-pages-clean-build-html',
        apply: 'build',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html.replace(
              /<script type="module" id="app-entry">[\s\S]*?<\/script>/,
              '<script type="module" src="/src/main.tsx"></script>'
            );
          },
        },
        closeBundle() {
          const outBundleDir = path.resolve(__dirname, 'public/bundle');
          const jsSrc = path.resolve(__dirname, 'dist/assets/index.js');
          const cssSrc = path.resolve(__dirname, 'dist/assets/index.css');
          fs.mkdirSync(outBundleDir, { recursive: true });
          if (fs.existsSync(jsSrc)) {
            fs.copyFileSync(jsSrc, path.resolve(outBundleDir, 'app.js'));
          }
          if (fs.existsSync(cssSrc)) {
            fs.copyFileSync(cssSrc, path.resolve(outBundleDir, 'app.css'));
          }
        },
      },
      react(),
      tailwindcss(),
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/index.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
