import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { assert, describe, it } from "@effect/vitest";
import { messageOfStatus, NO_API_ANSWERS } from "../src/client/remote";
import { apiLineOf, isUnderVitest } from "../src/server/dev-notice";
import { PORT } from "../src/shared/address";

const EXPLORER = nodePath.resolve(import.meta.dirname, "..");

describe("the dev server and the API", () => {
  it("says in one line which API it uses, or the command that starts one on that port", () => {
    assert.strictEqual(apiLineOf(PORT, true), `  The dev server uses the explorer API on port ${PORT}.`);
    assert.strictEqual(apiLineOf(PORT, false), `  No explorer API answers on port ${PORT}. Start one in a second terminal: npm run serve`);
    assert.strictEqual(apiLineOf(4800, false), "  No explorer API answers on port 4800. Start one in a second terminal: EXPLORER_PORT=4800 npm run serve");
    for (const line of [apiLineOf(PORT, true), apiLineOf(4800, false)]) assert.isFalse(line.includes("\n"), "one line");
  });

  it("makes no request when Vitest loads the configuration: this run has the variable that the configuration checks", () => {
    assert.isTrue(isUnderVitest(process.env));
    assert.isFalse(isUnderVitest({ PATH: "/usr/bin" }));
    const configuration = readFileSync(nodePath.join(EXPLORER, "vite.config.ts"), "utf8");
    assert.match(configuration, /configureServer\(server\) \{\s+if \(isUnderVitest\(process\.env\)\) return;/, "the check comes before each other statement of the plugin");
  });

  it("starts no process: no source file and no configuration file has the means", () => {
    const sources = readdirSync(nodePath.join(EXPLORER, "src"), { recursive: true, encoding: "utf8" })
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => nodePath.join("src", name));
    const withTheMeans = [...sources, "vite.config.ts"].filter((file) => /child_process|\bspawn\b|\bfork\b|\bexecFile\b|new Worker\b/.test(readFileSync(nodePath.join(EXPLORER, file), "utf8")));

    assert.isAbove(sources.length, 40, "the source files moved");
    assert.deepStrictEqual(withTheMeans, []);
  });

  it("says what to start when no API answers, for the page of the explorer and for the page of the dev server", () => {
    assert.strictEqual(messageOfStatus(undefined), NO_API_ANSWERS, "the request got no response: the server of `npm start` is not there");
    assert.strictEqual(messageOfStatus(502), NO_API_ANSWERS, "the dev server answers with 502 for an API that is not there");
    assert.strictEqual(messageOfStatus(504), NO_API_ANSWERS);
    assert.strictEqual(messageOfStatus(500), "The server answered with status 500.", "a server that answers with an error is there");
    assert.isTrue(NO_API_ANSWERS.includes("`npm start`") && NO_API_ANSWERS.includes("`npm run serve`") && NO_API_ANSWERS.includes("`npm run dev`"));
    assert.strictEqual(NO_API_ANSWERS.match(/[.!?](?:\s|$)/g)?.length, 1, "one sentence");
  });
});
