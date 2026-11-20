import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app under /<repo-name>/
const base = process.env.BASE_PATH ?? '/MeteOrto/'

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'MeteOrto',
        short_name: 'MeteOrto',
        description: 'Meteo su misura per il tuo orto',
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#FFF7E0',
        theme_color: '#FFB627',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'] },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
