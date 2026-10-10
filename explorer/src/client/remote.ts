import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { ExplorerApi } from "../shared/api";
import type { ExplorerIndex, SkillDoc } from "../shared/model";

const explorer = HttpApiClient.make(ExplorerApi).pipe(
  Effect.map((client) => client.explorer),
  Effect.provide(FetchHttpClient.layer),
);

export type Remote<Value> =
  | { readonly kind: "ok"; readonly value: Value }
  | { readonly kind: "notFound" }
  | { readonly kind: "failed"; readonly message: string };

type RemoteError = Effect.Error<ReturnType<Effect.Success<typeof explorer>["doc"]>>;

const failure = (error: RemoteError): Remote<never> => {
  switch (error._tag) {
    case "DocNotFound":
      return { kind: "notFound" };
    case "IndexUnavailable":
      return { kind: "failed", message: `The server cannot read the skills: ${error.detail}` };
    case "SchemaError":
      return { kind: "failed", message: "The server sent data in a format that this client does not know." };
    case "HttpClientError": {
      const status = error.response?.status;
      return {
        kind: "failed",
        message: status === undefined ? `The server at ${window.location.host} did not answer.` : `The server answered with status ${status}.`,
      };
    }
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
