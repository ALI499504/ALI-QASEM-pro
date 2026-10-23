import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    // Improve chunk splitting for faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-charts": ["recharts", "lightweight-charts"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-motion": ["framer-motion"],
          "vendor-axios": ["axios"],
        },
      },
    },
    // Raise warning threshold (project is intentionally feature-rich)
    chunkSizeWarningLimit: 1000,
  },
}));
