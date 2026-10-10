import { defineConfig } from "vite";
import { HOST, PORT } from "./src/shared/address.ts";

export default defineConfig({
  server: {
    host: HOST,
    port: 4748,
    strictPort: true,
    // The server answers only to its own host name, so the proxy must send that name.
    proxy: { "/api": { target: `http://${HOST}:${PORT}`, changeOrigin: true } },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      // `motion` marks its files with "use client". A bundle for the browser has no use for the directive.
      onwarn: (warning, warn) => {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
});
