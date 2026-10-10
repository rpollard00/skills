import type { ReactNode } from "react";
import { resolveLink } from "../shared/markdown";

/**
 * Where a skill comes from. `repository` is a plain string here on purpose: this component makes a link from it,
 * so it applies the scheme rule of the document body itself and does not rely on the type of the value.
 */
export type OriginView =
  | { readonly kind: "original" | "unknown" }
  | { readonly kind: "imported"; readonly upstream: string; readonly repository: string; readonly revision: string; readonly source: string };

export const OriginFact = ({ origin }: { readonly origin: OriginView }): ReactNode => {
  switch (origin.kind) {
    case "original":
      return "Written in this repository.";
    case "unknown":
      return "No record.";
    case "imported": {
      const repository = resolveLink({ from: "", href: origin.repository });
      return (
        <>
          Imported from {origin.upstream}, revision <code>{origin.revision.slice(0, 10)}</code>.
          <br />
          Source <code>{origin.source}</code> in{" "}
          {repository.kind === "external" ? (
            <a href={repository.url} target="_blank" rel="noreferrer noopener">
              {repository.url.replace(/^https?:\/\//i, "")}
            </a>
          ) : (
            <span className="plain-link">{origin.repository}</span>
          )}
        </>
      );
    }
    default: {
      const _exhaustive: never = origin;
      return _exhaustive;
    }
  }
};
