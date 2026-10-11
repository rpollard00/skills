import { defineConfig, type Plugin, type UserConfig } from "vite";
import { devNoticeOf, type Variables } from "./src/server/dev-notice.ts";
import { HOST } from "./src/shared/address.ts";

const INDEX_UNAVAILABLE = 503;

/** The configuration for one environment. The commands use the environment of the process, and a test gives a different one. It makes no request. */
export const configFor = (variables: Variables): UserConfig => {
  const notice = devNoticeOf(variables);
  const api = `http://${HOST}:${notice.apiPort}`;

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
  const apiLine: Plugin = {
    name: "explorer-api-line",
    apply: "serve",
    configureServer(server) {
      if (notice.isUnderVitest) return;
      server.httpServer?.once("listening", () => {
        void explorerAnswers().then((answers) => server.config.logger.info(notice.line(answers)));
      });
    },
  };

  return {
    plugins: [apiLine],
    // The page of the dev server gives the command that starts the API, so it must know the port of the API.
    define: { __EXPLORER_API_PORT__: JSON.stringify(notice.apiPort) },
    server: {
      host: HOST,
      port: notice.devPort,
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
  };
};

export default defineConfig(configFor(process.env));
