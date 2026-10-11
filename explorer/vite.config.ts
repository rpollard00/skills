import { defineConfig, type Plugin } from "vite";
import { apiLineOf, isUnderVitest } from "./src/server/dev-notice.ts";
import { DEV_PORT, HOST, PORT, portFrom } from "./src/shared/address.ts";

const portOf = (name: string, fallback: number): number => {
  const choice = portFrom({ name, value: process.env[name], fallback });
  if (choice.kind === "invalid") throw new Error(choice.message);
  return choice.port;
};

const apiPort = portOf("EXPLORER_PORT", PORT);
const devPort = portOf("EXPLORER_DEV_PORT", DEV_PORT);
const api = `http://${HOST}:${apiPort}`;

const INDEX_UNAVAILABLE = 503;

/** An explorer answers this path with the index, or with 503 when it cannot read the skills. */
const explorerAnswers = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${api}/api/index`, { signal: AbortSignal.timeout(2_000) });
    return response.ok || response.status === INDEX_UNAVAILABLE;
  } catch {
    return false;
  }
};

/**
 * Says in one line whether an explorer API answers. It makes one request when the dev server listens, and it starts nothing.
 * Vitest also loads this file and also has a server, so the plugin does nothing there.
 */
const apiLine = (): Plugin => ({
  name: "explorer-api-line",
  apply: "serve",
  configureServer(server) {
    if (isUnderVitest(process.env)) return;
    server.httpServer?.once("listening", () => {
      void explorerAnswers().then((answers) => server.config.logger.info(apiLineOf(apiPort, answers)));
    });
  },
});

export default defineConfig({
  plugins: [apiLine()],
  server: {
    host: HOST,
    port: devPort,
    strictPort: true,
    // The server answers only to its own host name, so the proxy must send that name.
    proxy: { "/api": { target: api, changeOrigin: true } },
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
