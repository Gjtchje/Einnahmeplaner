import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  // Entwicklungs-Proxy: Anfragen an /api leitet Vite an das Deno-Backend weiter.
  // So spricht das Frontend nur mit "sich selbst" und es gibt keine CORS-Probleme.
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
