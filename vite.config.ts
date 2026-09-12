import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const backendPrefixes = [
  '/auth',
  '/admin',
  '/agreements',
  '/bookmarks',
  '/boosts',
  '/exports',
  '/forex',
  '/leases',
  '/maintenance',
  '/managers',
  '/messages',
  '/notifications',
  '/payments',
  '/payment-verifications',
  '/properties',
  '/property-types',
  '/receipts',
  '/regions',
  '/rental-units',
  '/reports',
  '/saved-phones',
  '/subscriptions',
  '/tenants',
  '/terms',
  '/tracking',
  '/uploads',
  '/webhooks',
];

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: Object.fromEntries(
      backendPrefixes.map(prefix => [prefix, { target: 'http://localhost:8000', changeOrigin: true }])
    ),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) return "charts";
            if (id.includes("react-router")) return "router";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("date-fns")) return "dates";
            if (id.includes("lucide")) return "icons";
            return "vendor";
          }
        },
      },
    },
  },
});
