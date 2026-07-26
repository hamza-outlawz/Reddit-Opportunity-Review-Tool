import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend calls /api/review. In dev, Vite proxies that to the local
// relay on port 8787 so you don't hit CORS and the API key stays server-side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
