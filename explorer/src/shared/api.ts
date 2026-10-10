import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { DocNotFound, ExplorerIndex, IndexUnavailable, SkillDoc } from "./model";

export { HOST, PORT } from "./address";

/** Any string. A path that the scan does not list gets the typed 404 from the handler, not a decode error from here. */
const RequestedPath = Schema.String;

export class ExplorerApi extends HttpApi.make("skill-explorer").add(
  HttpApiGroup.make("explorer")
    .add(
      HttpApiEndpoint.get("index", "/index", { success: ExplorerIndex, error: IndexUnavailable }),
      HttpApiEndpoint.get("doc", "/doc", {
        query: { path: RequestedPath },
        success: SkillDoc,
        error: [DocNotFound, IndexUnavailable],
      }),
    )
    .prefix("/api"),
) {}
