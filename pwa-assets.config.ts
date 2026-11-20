import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0.15, resizeOptions: { background: '#FFE9A8' } },
    apple: { sizes: [180], padding: 0.1, resizeOptions: { background: '#FFE9A8' } },
  },
  images: ['public/favicon.svg'],
})
