/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Import path module for resolving file paths
import { resolve } from 'path';
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
 
  assetsInclude: ['**/*.wasm'], 
  plugins: [react(), wasm(), topLevelAwait(), VitePWA({
    registerType: "autoUpdate",

    manifest: {
      name: 'Qortal Go',
      short_name: 'Go',
      description: 'Your easy access to the Qortal blockchain',
      start_url: '/',
      display: 'standalone',

      theme_color: '#1f2023',
      background_color: '#1f2023',
      icons: [
        {
          src: '/qortal192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/qortal.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
      disableDevLogs: true, // Suppresses logs in development
      skipWaiting: true,  // Forces the new version to activate immediately
      clientsClaim: true  // Makes the new service worker take control
    },
  })],
  build: {
    rollupOptions: {
      // Specify multiple entry points for Rollup
      input: {
        index: resolve(__dirname, 'index.html'), // Main entry for your React app
        background: resolve(__dirname, 'src/background.ts'), // Separate entry for the background script
      },
      output: {
        // Adjust the output settings if necessary
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [fixReactVirtualized],
    },
  },
});
