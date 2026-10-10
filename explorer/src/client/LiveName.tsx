import type { ReactNode } from "react";
import { codeSpans } from "../shared/markdown";
import type { NodeId } from "../shared/model";
import type { Hover } from "../shared/view/state";

/** What makes a skill name live: the names, and what a pointer and a click on a name do. */
export interface LiveNames {
  readonly names: ReadonlyMap<string, NodeId>;
  readonly onPick: (id: NodeId) => void;
  readonly onHover: (hover: Hover) => void;
}

const SIGIL = /^(?:\/skill:|[/$@])/;

/** The skill that a code span names: `architect`, or the name after a sigil as in `/how` and `$mako`. */
export const namedSkill = (code: string, names: ReadonlyMap<string, NodeId>): NodeId | undefined => names.get(code.replace(SIGIL, ""));

/** A code span that holds the name of a skill: the pointer rings the node on the map, and a click selects it. */
export const LiveName = ({ id, live, children }: { readonly id: NodeId; readonly live: LiveNames; readonly children: ReactNode }): ReactNode => {
  const point = (): void => live.onHover({ kind: "ref", id });
  const leave = (): void => live.onHover({ kind: "none" });
  return (
    <button type="button" className="live" data-live={id} onClick={() => live.onPick(id)} onPointerEnter={point} onPointerLeave={leave} onFocus={point} onBlur={leave}>
      <code>{children}</code>
    </button>
  );
};

/**
 * One line of text from a description, a purpose, or a trigger. It is not a document: only its code spans get markup,
 * so backticks do not show. With `live`, a code span that names a skill is live, as in the body of a document.
 */
export const InlineText = ({ text, live }: { readonly text: string; readonly live?: LiveNames | undefined }): ReactNode => {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const span of codeSpans(text)) {
    const id = live === undefined ? undefined : namedSkill(span.content, live.names);
    parts.push(text.slice(at, span.start));
    parts.push(
      id === undefined || live === undefined ? (
        <code key={span.start}>{span.content}</code>
      ) : (
        <LiveName key={span.start} id={id} live={live}>
          {span.content}
        </LiveName>
      ),
    );
    at = span.end;
  }
  parts.push(text.slice(at));
  return <>{parts}</>;
};
