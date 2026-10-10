import type { ReactNode } from "react";
import { Answer, type Evidence, type Relation } from "../shared/model";
import type { Strip as StripView } from "../shared/view/strip";
import { ArrowLeft, ArrowRight } from "./icons";
import { InlineText } from "./LiveName";

const ANSWERS = Answer.literals.join("|");

/** The key that opens the block that the strip quotes. `App` listens for it. */
export const OPEN_EVIDENCE_KEY = "e";

const count = (value: number, one: string, many: string): string => `${value} ${value === 1 ? one : many}`;

/**
 * The file and the line are a control that opens the file at that line. The key does the same while the pointer or
 * the keyboard focus is on the cable or on the node, where no Tab press gets to this control.
 * Each heading above the block follows, from the top heading down.
 */
const Source = ({ evidence, onOpen }: { readonly evidence: Evidence; readonly onOpen: (file: string, line: number) => void }): ReactNode => (
  <>
    <button
      type="button"
      className="strip-source"
      aria-label={`Open ${evidence.file} at line ${evidence.line}`}
      aria-keyshortcuts={OPEN_EVIDENCE_KEY}
      onClick={() => onOpen(evidence.file, evidence.line)}
    >
      <span className="strip-place">
        {evidence.file.replace(/^skills\//, "")}:{evidence.line}
      </span>
      <kbd className="strip-key" aria-hidden="true">
        {OPEN_EVIDENCE_KEY.toUpperCase()}
      </kbd>
    </button>
    {evidence.headings.length === 0 ? null : <span className="strip-headings">&rsaquo; {evidence.headings.join(" › ")}</span>}
  </>
);

const kindsOf = (relation: Relation): string => `${relation.kinds.join(", ")}${relation.conditional ? ", conditional" : ""}${relation.standing === "rejudge" ? ", evidence changed" : ""}`;

interface Actions {
  readonly onClear: () => void;
  readonly onOpenEvidence: (file: string, line: number) => void;
}

const content = (strip: StripView, actions: Actions): ReactNode => {
  switch (strip.kind) {
    case "idle":
      return (
        <span className="strip-quiet">
          {count(strip.skills, "skill", "skills")} · {count(strip.playbooks, "playbook", "playbooks")} · {count(strip.hosted, "hosted file", "hosted files")} ·{" "}
          {count(strip.relations, "relation", "relations")}
        </span>
      );
    case "purpose":
      return (
        <>
          <span className="strip-name">{strip.name}</span>
          <span className="strip-text">
            <InlineText text={strip.text} />
          </span>
        </>
      );
    case "evidence":
      return (
        <>
          <span className="strip-name">
            {strip.from} <span className="strip-quiet">&rsaquo;</span> {strip.to}
          </span>
          <span className="strip-kind">{kindsOf(strip.relation)}</span>
          <span className="strip-text">{strip.sentence}</span>
          <Source evidence={strip.shown} onOpen={actions.onOpenEvidence} />
          {strip.relation.ticket === null ? null : (
            <>
              <code className="strip-command">npm run judge -- {strip.relation.ticket}</code>
              <code className="strip-answers">&lt;{ANSWERS}&gt;</code>
            </>
          )}
        </>
      );
    case "trace":
      return (
        <>
          <span className="strip-name">{strip.task}</span>
          <span className="strip-kind">
            {strip.at === 0 ? `${count(strip.total, "step", "steps")}` : `step ${strip.at} of ${strip.total}`}
            {strip.conditional ? ", conditional" : ""}
          </span>
          <span className="strip-name">{strip.name}</span>
          <span className="strip-text">{strip.sentence}</span>
          {strip.shown === null ? null : <Source evidence={strip.shown} onOpen={actions.onOpenEvidence} />}
        </>
      );
    case "onlyRouter":
      return (
        <>
          <span className="strip-name">{strip.name}</span>
          <span className="strip-text">
            Only {strip.router} loads this{strip.sentences.length === 0 ? "." : ": "}
            {strip.sentences.map((sentence, index) => (
              <span key={sentence}>
                {index === 0 ? "" : ", "}&ldquo;
                <InlineText text={sentence} />
                &rdquo;
              </span>
            ))}
            {strip.sentences.length === 0 ? "" : "."}
          </span>
        </>
      );
    case "noMatch":
      return (
        <>
          <span className="strip-text">No skill, playbook, or route matches &ldquo;{strip.query}&rdquo;.</span>
          <button type="button" className="text-button" onClick={actions.onClear}>
            Clear
          </button>
        </>
      );
    default: {
      const _exhaustive: never = strip;
      return _exhaustive;
    }
  }
};

export interface StripProps extends Actions {
  /** Null until the index is ready. */
  readonly strip: StripView | null;
  readonly loading: boolean;
  readonly tracing: boolean;
  readonly onStep: (by: 1 | -1) => void;
}

/** One line under the map. Purpose and evidence show here, and nothing floats over the graph. */
export const Strip = ({ strip, loading, tracing, onClear, onOpenEvidence, onStep }: StripProps): ReactNode => (
  <footer className="strip" aria-live="polite">
    {tracing ? (
      <span className="strip-steps">
        <button type="button" className="key-button" aria-label="Previous step" onClick={() => onStep(-1)}>
          <ArrowLeft />
        </button>
        <button type="button" className="key-button" aria-label="Next step" onClick={() => onStep(1)}>
          <ArrowRight />
        </button>
      </span>
    ) : null}
    {strip === null ? <span className="strip-quiet">{loading ? "Reading the skills." : ""}</span> : content(strip, { onClear, onOpenEvidence })}
  </footer>
);
