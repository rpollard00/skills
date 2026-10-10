import nodePath from "node:path";
import { createServer } from "node:http";
import { NodeHttpServer } from "@effect/platform-node";
import { Console, Effect, FileSystem, Layer, References, type Path } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse, HttpStaticServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SkillIndex } from "../index/skill-index";
import { failWith } from "../reported-failure";
import { ExplorerApi, HOST } from "../shared/api";

const CLIENT_DIRECTORY = nodePath.resolve(import.meta.dirname, "..", "..", "dist");

export const ExplorerHandlers = HttpApiBuilder.group(
  ExplorerApi,
  "explorer",
  Effect.fn(function* (handlers) {
    const skills = yield* SkillIndex;
    return handlers.handleAll({
      index: () => skills.live,
      doc: ({ query }) => skills.document(query.path),
    });
  }),
);

const ApiRoutes = HttpApiBuilder.layer(ExplorerApi).pipe(Layer.provide(ExplorerHandlers));

const ClientRoutes = Layer.unwrap(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const isBuilt = yield* fs.exists(CLIENT_DIRECTORY).pipe(Effect.orElseSucceed(() => false));
    return isBuilt
      ? HttpStaticServer.layer({ root: CLIENT_DIRECTORY, spa: true })
      : HttpRouter.add("GET", "/", HttpServerResponse.text("The client is not built. The API is at /api/index.\n"));
  }),
);

/**
 * A page on a different site can point its own host name at 127.0.0.1 and then read this server from the browser.
 * Such a request carries that host name, so the server answers only to its own two names.
 */
const answerOnlyToLoopbackNames =
  (port: number) =>
  <E, R>(app: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const host = request.headers["host"];
      return host === `${HOST}:${port}` || host === `localhost:${port}`
        ? yield* app
        : HttpServerResponse.text(`This server answers only to http://${HOST}:${port}.\n`, { status: 403 });
    });

/**
 * The whole server for one index. It binds to the loopback address only and keeps no state between requests.
 * Port 0 takes a free port. The layer gives the `HttpServer`, so a caller can read the address that the server got.
 */
export const serverLayer = (options: {
  readonly port: number;
  readonly skills: Layer.Layer<SkillIndex, never, FileSystem.FileSystem | Path.Path>;
}) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const { address } = yield* HttpServer.HttpServer;
      const port = address._tag === "UnixPathAddress" ? options.port : address.port;
      yield* Console.log(`Skill explorer: http://${HOST}:${port}`);
      return HttpRouter.serve(Layer.mergeAll(ApiRoutes, ClientRoutes), {
        disableLogger: true,
        disableListenLog: true,
        middleware: answerOnlyToLoopbackNames(port),
      });
    }),
  ).pipe(
    Layer.provide(options.skills),
    Layer.provide(Layer.succeed(References.MinimumLogLevel, "Warn")),
    Layer.provideMerge(NodeHttpServer.layer(createServer, { port: options.port, host: HOST })),
  );

const isPortInUse = (cause: unknown): boolean =>
  typeof cause === "object" && cause !== null && "code" in cause && cause.code === "EADDRINUSE";

/** Runs until it is interrupted. If the server cannot start, it prints one line and fails. */
export const serve = (options: Parameters<typeof serverLayer>[0]) =>
  Layer.launch(serverLayer(options)).pipe(
    Effect.catchTag("ServeError", (error) =>
      failWith(
        isPortInUse(error.cause)
          ? `Port ${options.port} on ${HOST} is in use. The explorer may already be running at http://${HOST}:${options.port}.`
          : `The server cannot start on http://${HOST}:${options.port}.`,
      ),
    ),
  );
