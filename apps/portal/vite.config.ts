/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Portal EBR / BPM',
          short_name: 'EBR / BPM',
          description: 'Portal único de evaluación e inspección sanitaria',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          lang: 'es',
          theme_color: '#1E3A8A',
          background_color: '#F8FAFC',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/v1(?:\/|$)/, /^\/health(?:\/|$)/],
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: true },
      }),
    ],
    server: {
      port: 5179,
      strictPort: true,
      proxy: {
        '/v1': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
        '/health': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
      },
    },
    test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', clearMocks: true },
  }
})
