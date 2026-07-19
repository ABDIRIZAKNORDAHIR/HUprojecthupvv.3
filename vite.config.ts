import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['projecthub-logo.png', 'projecthub-favicon.png', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        id: '/',
        name: 'Hormuud ProjectHub — Hormuud University',
        short_name: 'ProjectHub',
        description: 'Connect, Collaborate, Create — academic project management for Hormuud University.',
        theme_color: '#16A34A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'projecthub-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: '/index.html',
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/hu\.edu\.so\/static\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hu-images',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    host: true,
    port: 5180,
    strictPort: true,
    open: '/',
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
