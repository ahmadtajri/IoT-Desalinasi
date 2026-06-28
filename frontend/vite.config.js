import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PWA manifest.json di public/ sudah cukup untuk install prompt
// Service worker caching dihapus karena menyebabkan reload loop di production
// App tetap bisa di-install sebagai PWA via manifest.json

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
});
