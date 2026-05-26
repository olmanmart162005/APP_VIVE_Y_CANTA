import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [

    react(),

    VitePWA({

      registerType:
        "autoUpdate",

      devOptions: {
        enabled: true,
      },

      includeAssets: [
        "logo.png",
      ],

      manifest: {

        id: "/",

        name:
          "Coro Vive y Canta",

        short_name:
          "Vive y Canta",

        description:
          "Sistema Administrativo del Coro Vive y Canta",

        theme_color:
          "#D4AF37",

        background_color:
          "#F8F4E9",

        display:
          "standalone",

        orientation:
          "portrait",

        scope:
          "/",

        start_url:
          "/",

        lang:
          "es",

        icons: [
          {
            src:
              "/logo.png",
            sizes:
              "192x192",
            type:
              "image/png",
            purpose:
              "any maskable",
          },

          {
            src:
              "/logo.png",
            sizes:
              "512x512",
            type:
              "image/png",
            purpose:
              "any maskable",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,png,svg,ico}"
        ]
      }

    }),
  ],

  build: {
    chunkSizeWarningLimit:
      1600,
  },
})