import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { assert, describe, it, vi } from "@effect/vitest";
import type { Plugin, UserConfig, ViteDevServer } from "vite";
import { messageOfStatus, noApiAnswers, noDevServerAnswers, originOfThisPage } from "../src/client/remote";
import { devNoticeOf } from "../src/server/dev-notice";
import { commandFor, DEV_PORT, HOST, PORT } from "../src/shared/address";

const EXPLORER = nodePath.resolve(import.meta.dirname, "..");

/** What the dev server did after it started to listen: each line that it printed. */
const listen = async (config: UserConfig): Promise<string[]> => {
  const lines: string[] = [];
  const plugins = (config.plugins ?? []).flat().filter((plugin): plugin is Plugin => typeof plugin === "object" && plugin !== null && "name" in plugin);
  const standIn = {
    httpServer: {
      once: (event: string, listener: () => void) => {
        if (event === "listening") listener();
      },
    },
    config: { logger: { info: (line: string) => void lines.push(line) } },
  };
  for (const plugin of plugins) {
    const hook = plugin.configureServer;
    const run = typeof hook === "function" ? hook : hook?.handler;
    // The stand-in has the two parts of the dev server that the configuration uses.
    await run?.call({} as never, standIn as unknown as ViteDevServer);
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
  return lines;
};

describe("the dev server and the API", () => {
  it("takes the two ports from the environment, and names the API port in its line and in the command of its line", () => {
    const moved = devNoticeOf({ EXPLORER_PORT: "4800", EXPLORER_DEV_PORT: "4801" });
    assert.deepStrictEqual<unknown>([moved.apiPort, moved.devPort], [4800, 4801]);
    assert.strictEqual(moved.line(true), "  The dev server uses the explorer API on port 4800.");
    assert.strictEqual(moved.line(false), "  No explorer API answers on port 4800. Start one in a second terminal: EXPLORER_PORT=4800 npm run serve");

    const usual = devNoticeOf({});
    assert.deepStrictEqual<unknown>([usual.apiPort, usual.devPort], [PORT, DEV_PORT]);
    assert.strictEqual(usual.line(true), `  The dev server uses the explorer API on port ${PORT}.`);
    assert.strictEqual(usual.line(false), `  No explorer API answers on port ${PORT}. Start one in a second terminal: npm run serve`, "the default port needs no variable");
    assert.strictEqual(devNoticeOf({ EXPLORER_DEV_PORT: "4801" }).line(false), usual.line(false), "the port of the dev server is not the port of the API");
    for (const line of [usual.line(true), usual.line(false), moved.line(true), moved.line(false)]) assert.isFalse(line.includes("\n"), "one line");

    assert.isTrue(devNoticeOf({ VITEST: "true" }).isUnderVitest);
    assert.isFalse(devNoticeOf({ PATH: "/usr/bin" }).isUnderVitest);
    assert.throws(() => devNoticeOf({ EXPLORER_PORT: "0" }), 'EXPLORER_PORT must be a port number from 1 to 65535. Its value is "0".');
    assert.throws(() => devNoticeOf({ EXPLORER_DEV_PORT: "x" }), "EXPLORER_DEV_PORT");
  });

  it("makes no request when Vitest loads the configuration, and one request to the API port when the dev server of a different environment listens", async () => {
    const asked: string[] = [];
    let answers = true;
    vi.stubGlobal("fetch", (input: unknown) => {
      asked.push(String(input));
      return answers ? Promise.resolve(new Response("{}")) : Promise.reject(new Error("no listener"));
    });
    try {
      vi.resetModules();
      const loaded = await import("../vite.config.ts");
      assert.isDefined(process.env["VITEST"], "this run has the variable that the configuration checks");
      assert.deepStrictEqual(await listen(loaded.default), [], "under Vitest the dev server prints no line");
      assert.deepStrictEqual(await listen(loaded.configFor(process.env)), []);
      assert.deepStrictEqual(asked, [], "under Vitest: no request when the file loads, and none when the server listens");

      const moved = loaded.configFor({ EXPLORER_PORT: "4800", EXPLORER_DEV_PORT: "4801" });
      assert.deepStrictEqual(asked, [], "the configuration of an environment makes no request before the server listens");
      assert.deepStrictEqual(await listen(moved), ["  The dev server uses the explorer API on port 4800."]);
      assert.deepStrictEqual(asked, [`http://${HOST}:4800/api/index`], "one request, to the API port and not to the port of the dev server");
      assert.deepStrictEqual<unknown>([moved.server?.port, moved.server?.strictPort, moved.server?.proxy], [4801, true, { "/api": { target: `http://${HOST}:4800`, changeOrigin: true } }]);
      assert.deepStrictEqual<unknown>(moved.define, { __EXPLORER_API_PORT__: "4800" }, "the page of the dev server gets the port of the API, and not the port of the dev server");

      answers = false;
      assert.deepStrictEqual(await listen(moved), ["  No explorer API answers on port 4800. Start one in a second terminal: EXPLORER_PORT=4800 npm run serve"]);
      assert.strictEqual(asked.length, 2, "one request for each start");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("starts no process: no source file and no configuration file has the means", () => {
    const sources = readdirSync(nodePath.join(EXPLORER, "src"), { recursive: true, encoding: "utf8" })
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => nodePath.join("src", name));
    const withTheMeans = [...sources, "vite.config.ts"].filter((file) => /child_process|\bspawn\b|\bfork\b|\bexecFile\b|new Worker\b/.test(readFileSync(nodePath.join(EXPLORER, file), "utf8")));

    assert.isAbove(sources.length, 40, "the source files moved");
    assert.deepStrictEqual(withTheMeans, []);
  });

  const isOneSentence = (text: string): boolean => text.match(/[.!?](?:\s|$)/g)?.length === 1;

  it("says on a page of the dev server which port has no API, with the command of the line that the dev server prints", () => {
    const page = noApiAnswers({ kind: "dev", apiPort: 4800, devPort: 4801 });
    const terminal = devNoticeOf({ EXPLORER_PORT: "4800", EXPLORER_DEV_PORT: "4801" }).line(false);
    const commandOfTheTerminal = terminal.slice(terminal.indexOf("terminal: ") + "terminal: ".length);

    assert.strictEqual(page, "No explorer API answers on port 4800: start one in a second terminal with `EXPLORER_PORT=4800 npm run serve`.");
    assert.strictEqual(commandOfTheTerminal, "EXPLORER_PORT=4800 npm run serve");
    assert.include(page, `\`${commandOfTheTerminal}\``, "the page and the terminal give one command");
    assert.notInclude(page, "4801", "the port of the dev server is not the port of the API");
    assert.strictEqual(noApiAnswers({ kind: "dev", apiPort: PORT, devPort: 4801 }), `No explorer API answers on port ${PORT}: start one in a second terminal with \`npm run serve\`.`, "the default port needs no variable");
    assert.isTrue(isOneSentence(page), "one sentence");
  });

  it("says on a page of the explorer itself to start the explorer again, with the variable only for a port that is not the default port", () => {
    assert.strictEqual(noApiAnswers({ kind: "explorer", port: PORT }), "No explorer API answers: start the explorer again with `npm start`.");
    assert.strictEqual(noApiAnswers({ kind: "explorer", port: 4800 }), "No explorer API answers: start the explorer again with `EXPLORER_PORT=4800 npm start`.");
    assert.notMatch(noApiAnswers({ kind: "explorer", port: PORT }), /EXPLORER_|npm run/);
    assert.isTrue(isOneSentence(noApiAnswers({ kind: "explorer", port: 4800 })), "one sentence");
  });

  it("says on a page of the dev server that the dev server does not answer, with the command that starts it again on its two ports", () => {
    const moved = noDevServerAnswers({ kind: "dev", apiPort: 4800, devPort: 4801 });

    assert.strictEqual(moved, "The dev server does not answer on port 4801: start it again with `EXPLORER_PORT=4800 EXPLORER_DEV_PORT=4801 npm run dev`.");
    assert.strictEqual(noDevServerAnswers({ kind: "dev", apiPort: PORT, devPort: DEV_PORT }), `The dev server does not answer on port ${DEV_PORT}: start it again with \`npm run dev\`.`, "each default port needs no variable");
    assert.strictEqual(noDevServerAnswers({ kind: "dev", apiPort: PORT, devPort: 4801 }), "The dev server does not answer on port 4801: start it again with `EXPLORER_DEV_PORT=4801 npm run dev`.");
    assert.strictEqual(noDevServerAnswers({ kind: "dev", apiPort: 4800, devPort: DEV_PORT }), `The dev server does not answer on port ${DEV_PORT}: start it again with \`EXPLORER_PORT=4800 npm run dev\`.`);
    assert.isTrue(isOneSentence(moved), "one sentence");
  });

  it("builds each command in one place, with a variable only for a port that is not its default", () => {
    assert.strictEqual(commandFor({ script: "npm start", port: PORT }), "npm start");
    assert.strictEqual(commandFor({ script: "npm start", port: 4800 }), "EXPLORER_PORT=4800 npm start");
    assert.strictEqual(commandFor({ script: "npm run serve", port: 4800 }), "EXPLORER_PORT=4800 npm run serve");
    assert.strictEqual(commandFor({ script: "npm run dev", apiPort: PORT, devPort: DEV_PORT }), "npm run dev");
    assert.strictEqual(commandFor({ script: "npm run dev", apiPort: 4800, devPort: 4801 }), "EXPLORER_PORT=4800 EXPLORER_DEV_PORT=4801 npm run dev");
    assert.strictEqual(commandFor({ script: "npm run dev", apiPort: DEV_PORT, devPort: PORT }), `EXPLORER_PORT=${DEV_PORT} EXPLORER_DEV_PORT=${PORT} npm run dev`, "each port has its own default");
  });

  it("knows where its page comes from: the dev server with the API port of its configuration and the port of its own address, or the explorer with the port of its own address", () => {
    assert.deepStrictEqual<unknown>(originOfThisPage({ port: "4750" }), { kind: "dev", apiPort: devNoticeOf(process.env).apiPort, devPort: 4750 }, "Vitest loads each file as the dev server does, so this page is a page of the dev server");
    vi.stubEnv("DEV", false);
    try {
      assert.deepStrictEqual<unknown>(originOfThisPage({ port: "4800" }), { kind: "explorer", port: 4800 }, "the built client is a page of the explorer, and the port of the page is the port of the API");
      assert.deepStrictEqual<unknown>(originOfThisPage({ port: String(PORT) }), { kind: "explorer", port: PORT });
      assert.deepStrictEqual<unknown>(originOfThisPage({ port: "" }), { kind: "explorer", port: 80 }, "an address with no port is on port 80");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("names the server that is gone: for no response the server of the page, and for the status of a proxy the API behind the dev server", () => {
    const dev = { kind: "dev", apiPort: 4800, devPort: 4801 } as const;
    const explorer = { kind: "explorer", port: 4800 } as const;

    assert.strictEqual(messageOfStatus(undefined, dev), noDevServerAnswers(dev), "a page of the dev server got no response: the dev server is gone, and the API can be there");
    assert.notInclude(messageOfStatus(undefined, dev), "npm run serve", "a second API on the port of an API that is there cannot start");
    assert.strictEqual(messageOfStatus(502, dev), noApiAnswers(dev), "the dev server is there, and it answers with 502 for an API that is not there");
    assert.strictEqual(messageOfStatus(504, dev), noApiAnswers(dev));
    assert.strictEqual(messageOfStatus(undefined, explorer), noApiAnswers(explorer), "a page of the explorer got no response: the explorer is gone");
    assert.strictEqual(messageOfStatus(502, explorer), noApiAnswers(explorer), "a proxy before the explorer answers with 502 for an explorer that is not there");
    assert.strictEqual(messageOfStatus(500, dev), "The server answered with status 500.", "a server that answers with an error is there");
    assert.strictEqual(messageOfStatus(500, explorer), "The server answered with status 500.");
  });
});
