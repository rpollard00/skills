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

/** The page comes from the explorer itself or from the dev server, and the page cannot know which. Thus the sentence gives the command for each. */
export const NO_API_ANSWERS = "No explorer API answers: start the explorer with `npm start`, or with `npm run serve` when this page comes from `npm run dev`.";

const STATUS_OF_A_PROXY_WITHOUT_ITS_TARGET: readonly number[] = [502, 504];

/** `undefined`: the request got no response. The dev server answers for an API that is not there with the status of a proxy. */
export const messageOfStatus = (status: number | undefined): string =>
  status === undefined || STATUS_OF_A_PROXY_WITHOUT_ITS_TARGET.includes(status) ? NO_API_ANSWERS : `The server answered with status ${status}.`;

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
      return { kind: "failed", message: messageOfStatus(error.response?.status) };
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
