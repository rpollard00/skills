import { spawn, type ChildProcess, type StdioOptions } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import { DEV_PORT, HOST, PORT, portFrom, STOP_WHEN_INPUT_ENDS } from "./src/shared/address.ts";

declare global {
  /** Vite loads this file again on each reload of the config, and one API must serve the process from start to end. Thus the process holds it. */
  var explorerApiOfThisProcess: ChildProcess | undefined;
}

const portOf = (name: string, fallback: number): number => {
  const choice = portFrom({ name, value: process.env[name], fallback });
  if (choice.kind === "invalid") throw new Error(choice.message);
  return choice.port;
};

const apiPort = portOf("EXPLORER_PORT", PORT);
const devPort = portOf("EXPLORER_DEV_PORT", DEV_PORT);
const api = `http://${HOST}:${apiPort}`;

// The input stays open until this process ends in any way, a kill included: the API stops then. The output carries the address line.
const INPUT_HELD_OPEN_AND_OUTPUT_READ_AND_EACH_ERROR_SHOWN: StdioOptions = ["pipe", "pipe", "inherit"];

const API_START_LIMIT_MS = 15_000;

const apiAnswers = async (): Promise<boolean> => {
  try {
    return (await fetch(`${api}/api/index`, { signal: AbortSignal.timeout(2_000) })).ok;
  } catch {
    return false;
  }
};

const isRunning = (child: ChildProcess): boolean => child.exitCode === null && child.signalCode === null;

type Start = "listens" | "ended" | "late";

/** An API prints its address only after it has the port. One that finds the port in use ends and prints no address. */
const startOf = (child: ChildProcess): Promise<Start> =>
  new Promise((resolve) => {
    let printed = "";
    child.stdout?.setEncoding("utf8").on("data", (text: string) => {
      if (printed.includes(api)) return;
      printed += text;
      if (printed.includes(api)) resolve("listens");
    });
    child.once("exit", () => resolve("ended"));
    child.once("error", () => resolve("ended"));
    setTimeout(() => resolve("late"), API_START_LIMIT_MS).unref();
  });

const IN_USE = `  An explorer API is already on port ${apiPort}. The dev server uses it and does not stop it.`;

const explorerApi = (): Plugin => ({
  name: "explorer-api",
  apply: "serve",
  async configureServer(server) {
    const held = globalThis.explorerApiOfThisProcess;
    if (held !== undefined && isRunning(held)) return;
    if (await apiAnswers()) {
      server.config.logger.info(IN_USE);
      return;
    }

    const child = spawn(process.execPath, ["--import", "tsx", "src/server/main.ts", STOP_WHEN_INPUT_ENDS], {
      cwd: server.config.root,
      env: { ...process.env, EXPLORER_PORT: String(apiPort) },
      stdio: INPUT_HELD_OPEN_AND_OUTPUT_READ_AND_EACH_ERROR_SHOWN,
    });
    globalThis.explorerApiOfThisProcess = child;

    const start = await startOf(child);
    server.config.logger.info(
      start === "listens"
        ? `  The dev server started an explorer API on port ${apiPort}. The API stops when the dev server stops.`
        : start === "ended" && (await apiAnswers())
          ? IN_USE
          : `  The explorer API did not start on port ${apiPort}. The page cannot read the skills.`,
    );
  },
});

export default defineConfig({
  plugins: [explorerApi()],
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
