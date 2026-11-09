import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/sanctum': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // Uploaded files (avatars, …) served from Laravel's public storage symlink.
      // Storage::url() returns a root-relative "/storage/..." path.
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Grosses libs tierces isolées dans leurs propres chunks : elles ne
        // sont re-téléchargées (cache navigateur) que si CETTE lib change,
        // pas à chaque déploiement applicatif.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router", "react-router-dom"],
          "vendor-charts": ["apexcharts", "react-apexcharts"],
          "vendor-maps": ["leaflet", "leaflet.heat", "react-leaflet", "@react-jvectormap/core", "@react-jvectormap/world"],
          "vendor-calendar": [
            "@fullcalendar/core",
            "@fullcalendar/daygrid",
            "@fullcalendar/interaction",
            "@fullcalendar/list",
            "@fullcalendar/react",
            "@fullcalendar/timegrid",
          ],
          "vendor-motion": ["framer-motion"],
          "vendor-i18n": ["i18next", "react-i18next"],
        },
      },
    },
  },
});
