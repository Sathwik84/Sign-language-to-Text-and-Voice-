import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /video, /live, /health requests → Flask backend
      "/video": { target: "http://localhost:5000", changeOrigin: true },
      "/live": { target: "http://localhost:5000", changeOrigin: true },
      "/health": { target: "http://localhost:5000", changeOrigin: true },
    }
  }
});
