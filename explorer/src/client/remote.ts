import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { commandFor } from "../shared/address";
import { ExplorerApi } from "../shared/api";
import type { ExplorerIndex, SkillDoc } from "../shared/model";

/** `vite.config.ts` defines it: the port to which the dev server sends each API request. */
declare const __EXPLORER_API_PORT__: number;

const explorer = HttpApiClient.make(ExplorerApi).pipe(
  Effect.map((client) => client.explorer),
  Effect.provide(FetchHttpClient.layer),
);

export type Remote<Value> =
  | { readonly kind: "ok"; readonly value: Value }
  | { readonly kind: "notFound" }
  | { readonly kind: "failed"; readonly message: string };

/** Where a page comes from. The dev server has its API on a second port. The explorer serves the page and the API on one port. */
export type PageOrigin = { readonly kind: "dev"; readonly apiPort: number; readonly devPort: number } | { readonly kind: "explorer"; readonly port: number };

const PORT_OF_AN_ADDRESS_WITHOUT_ONE = 80;

/** Vite sets the flag for a page of the dev server. `port` is the port in the address of the page, and it is empty for port 80. */
export const originOfThisPage = (address: { readonly port: string } = window.location): PageOrigin => {
  const port = address.port === "" ? PORT_OF_AN_ADDRESS_WITHOUT_ONE : Number(address.port);
  return import.meta.env.DEV ? { kind: "dev", apiPort: __EXPLORER_API_PORT__, devPort: port } : { kind: "explorer", port };
};

/** One sentence with the one command that starts the API of this page. The command for a page of the dev server is the command in the line that `npm run dev` prints. */
export const noApiAnswers = (origin: PageOrigin): string =>
  origin.kind === "dev"
    ? `No explorer API answers on port ${origin.apiPort}: start one in a second terminal with \`${commandFor({ script: "npm run serve", port: origin.apiPort })}\`.`
    : `No explorer API answers: start the explorer again with \`${commandFor({ script: "npm start", port: origin.port })}\`.`;

/** One sentence with the one command that starts the dev server of this page again. */
export const noDevServerAnswers = (origin: Extract<PageOrigin, { readonly kind: "dev" }>): string =>
  `The dev server does not answer on port ${origin.devPort}: start it again with \`${commandFor({ script: "npm run dev", apiPort: origin.apiPort, devPort: origin.devPort })}\`.`;

const STATUS_OF_A_PROXY_WITHOUT_ITS_TARGET: readonly number[] = [502, 504];

/**
 * `undefined`: the request got no response, so the server of the page is gone. That server is the dev server for a page of the dev server, and the explorer for a page of the explorer.
 * A dev server that is there answers for an API that is not there with the status of a proxy.
 */
export const messageOfStatus = (status: number | undefined, origin: PageOrigin): string => {
  if (status === undefined) return origin.kind === "dev" ? noDevServerAnswers(origin) : noApiAnswers(origin);
  return STATUS_OF_A_PROXY_WITHOUT_ITS_TARGET.includes(status) ? noApiAnswers(origin) : `The server answered with status ${status}.`;
};

type RemoteError = Effect.Error<ReturnType<Effect.Success<typeof explorer>["doc"]>>;

const failure = (error: RemoteError): Remote<never> => {
  switch (error._tag) {
    case "DocNotFound":
      return { kind: "notFound" };
    case "IndexUnavailable":
      return { kind: "failed", message: `The server cannot read the skills: ${error.detail}` };
    case "SchemaError":
      return { kind: "failed", message: "The server sent data in a format that this client does not know." };
    case "HttpClientError":
      return { kind: "failed", message: messageOfStatus(error.response?.status, originOfThisPage()) };
    default: {
      const _exhaustive: never = error;
      return _exhaustive;
    }
  }
};

const ok = <Value>(value: Value): Remote<Value> => ({ kind: "ok", value });

const run = <Value>(call: Effect.Effect<Value, RemoteError>, signal: AbortSignal): Promise<Remote<Value>> =>
  Effect.runPromise(Effect.match(call, { onFailure: failure, onSuccess: ok<Value> }), { signal });

export const fetchIndex = (signal: AbortSignal): Promise<Remote<ExplorerIndex>> =>
  run(Effect.flatMap(explorer, (client) => client.index()), signal);

export const fetchDoc = (path: string, signal: AbortSignal): Promise<Remote<SkillDoc>> =>
  run(Effect.flatMap(explorer, (client) => client.doc({ query: { path } })), signal);
