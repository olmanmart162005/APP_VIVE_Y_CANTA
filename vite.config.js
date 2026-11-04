import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      devOptions: {
        enabled: true,
      },

      includeAssets: [
        "logo.png",
        "icon-192.png",
        "icon-512.png",
        "apple-touch-icon.png",
        "favicon.png",
        "favicon.ico",
      ],

      manifest: {
        id: "/",
        name: "Coro de Alabanza Vive y Canta",
        short_name: "Vive y Canta",
        description: "Sistema administrativo del Coro de Alabanza Vive y Canta",
        theme_color: "#111111",
        background_color: "#111111",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "es",
        categories: ["music", "productivity", "utilities"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB — needed for pdfmake bundle
        runtimeCaching: [
          {
            // Seguridad: NO cachear consultas directas a la base de datos ni autenticación de Supabase
            urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth)\/.*$/i,
            handler: "NetworkOnly",
          },
          {
            // Caching suave de imágenes públicas de almacenamiento de Supabase (avatares, fotos)
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-public-images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
              },
            },
          },
          {
            // Fuentes tipográficas de Google Fonts si las hubiera
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],

  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("pdfmake")) return "pdfmake"
        },
      },
    },
  },
})