import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

function getCommitHash() {
  const environmentCommit = [
    process.env.VITE_GIT_COMMIT_SHA ||
      process.env.VITE_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT ||
      process.env.COMMIT_SHA ||
      process.env.SOURCE_COMMIT ||
      process.env.SOURCE_VERSION ||
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.COOLIFY_GIT_COMMIT_SHA ||
      process.env.DOKPLOY_GIT_COMMIT_SHA ||
      process.env.DOKPLOY_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.CF_PAGES_COMMIT_SHA ||
      process.env.RENDER_GIT_COMMIT
  ]
    .map((value) => String(value ?? '').trim())
    .find((value) => value && value !== 'null' && value !== 'undefined')

  if (environmentCommit) return environmentCommit.slice(0, 7)

  try {
    return execSync('git rev-parse --short=7 HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return 'sin-git'
  }
}

const appCommit = getCommitHash()
const appVersion = `${packageJson.version}+${appCommit}`

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify(appCommit)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registra el service worker también en `vite dev`. Sin SW activo el
      // navegador nunca dispara `beforeinstallprompt`, así que la instalación
      // no se puede probar en desarrollo.
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'Wordblade',
        short_name: 'Wordblade',
        description: 'Forjá palabras y combatí con acero en este RPG de letras.',
        theme_color: '#07132f',
        background_color: '#050817',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        lang: 'es',
        id: '/',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    // No vigilar los assets estáticos: no necesitan hot-reload y, en Windows
    // con OneDrive sincronizando, el watcher se cae con EBUSY sobre imágenes
    // que quedan bloqueadas un instante. Ignorarlas mantiene el server estable.
    watch: {
      ignored: ['**/public/**', '**/dev-dist/**']
    },
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
})
