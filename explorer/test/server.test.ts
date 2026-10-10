import http from "node:http";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Console, Context, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { SkillIndex } from "../src/index/skill-index";
import { serve, serverLayer } from "../src/server/server";
import { captureInto, temporaryRepo } from "./support";

/** One GET with a chosen `Host` header. The socket always goes to the loopback address. */
const get = (port: number, path: string, host: string) =>
  Effect.promise(
    () =>
      new Promise<{ readonly status: number; readonly body: string }>((resolve, reject) => {
        http
          .get({ host: "127.0.0.1", port, path, headers: { Host: host } }, (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => chunks.push(chunk));
            response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
          })
          .on("error", reject);
      }),
  );

const startedOn = (root: string, printed: string[]) =>
  Effect.gen(function* () {
    const context = yield* Layer.build(serverLayer({ port: 0, skills: SkillIndex.layer(root) })).pipe(
      Effect.provideService(Console.Console, captureInto(printed)),
    );
    return Context.get(context, HttpServer.HttpServer).address;
  });

describe("the server", () => {
  it.live("binds to the loopback address only, and prints where it listens", () =>
    Effect.gen(function* () {
      const printed: string[] = [];
      const address = yield* startedOn(yield* temporaryRepo, printed);
      assert.strictEqual(address._tag, "InetAddressV4");
      if (address._tag !== "InetAddressV4") return;
      assert.strictEqual(String(address.address), "127.0.0.1");
      assert.isAbove(address.port, 0);

      assert.strictEqual((yield* get(address.port, "/api/index", `127.0.0.1:${address.port}`)).status, 200);
      assert.deepStrictEqual(printed, [`Skill explorer: http://127.0.0.1:${address.port}`]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.live("answers only to its own two host names, for the API and for the client files", () =>
    Effect.gen(function* () {
      const address = yield* startedOn(yield* temporaryRepo, []);
      if (address._tag !== "InetAddressV4") return assert.fail("The server has no TCP address.");
      const { port } = address;

      for (const host of [`127.0.0.1:${port}`, `localhost:${port}`]) {
        const index = yield* get(port, "/api/index", host);
        assert.deepStrictEqual([index.status, index.body.startsWith('{"version":1,')], [200, true], host);
        assert.strictEqual((yield* get(port, "/", host)).status, 200, host);
      }
      for (const host of ["evil.example", `evil.example:${port}`, "127.0.0.1", `127.0.0.1:${port + 1}`, `localhost.evil.example:${port}`]) {
        for (const path of ["/api/index", "/api/doc?path=skills/alpha/SKILL.md", "/", "/assets/missing.js"]) {
          assert.deepStrictEqual(yield* get(port, path, host), { status: 403, body: `This server answers only to http://127.0.0.1:${port}.\n` }, `${host} ${path}`);
        }
      }
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.live("prints one line and fails when the port is in use", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const address = yield* startedOn(root, []);
      if (address._tag !== "InetAddressV4") return assert.fail("The server has no TCP address.");

      const printed: string[] = [];
      const failure = yield* serve({ port: address.port, skills: SkillIndex.layer(root) }).pipe(
        Effect.provideService(Console.Console, captureInto(printed)),
        Effect.flip,
      );
      assert.strictEqual(failure._tag, "ReportedFailure");
      assert.deepStrictEqual(printed, [
        `Port ${address.port} on 127.0.0.1 is in use. The explorer may already be running at http://127.0.0.1:${address.port}.`,
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
