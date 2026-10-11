import type { ReactNode } from "react";
import { Answer, type Evidence, type Relation } from "../shared/model";
import type { Hidden } from "../shared/view/lit";
import type { Strip as StripView } from "../shared/view/strip";
import { ArrowLeft, ArrowRight } from "./icons";
import { InlineText } from "./LiveName";
import { count } from "./count";

const ANSWERS = Answer.literals.join("|");

export const OPEN_EVIDENCE_KEY = "e";

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
    case "notInView":
      return (
        <>
          <span className="strip-name">{strip.name}</span>
          <span className="strip-text">is not in this view, and the map shows it when you turn off the lock.</span>
        </>
      );
    default: {
      const _exhaustive: never = strip;
      return _exhaustive;
    }
  }
};

/** A relation counts when its other node is not in the view, whether the relation goes to that node or comes from it. */
const hiddenSentence = (hidden: Hidden): string | null => {
  switch (hidden.kind) {
    case "none":
      return null;
    case "relations":
      return hidden.count === 1 ? "1 relation is with a node that is not in this view." : `${hidden.count} relations are with nodes that are not in this view.`;
    case "steps":
      return hidden.count === 1 ? "1 step is not in this view." : `${hidden.count} steps are not in this view.`;
    default: {
      const _exhaustive: never = hidden;
      return _exhaustive;
    }
  }
};

const hiddenOf = (strip: StripView): Hidden => (strip.kind === "purpose" || strip.kind === "onlyRouter" || strip.kind === "trace" ? strip.hidden : { kind: "none" });

export interface StripProps extends Actions {
  /** Null until the index is ready. */
  readonly strip: StripView | null;
  readonly loading: boolean;
  readonly tracing: boolean;
  readonly onStep: (by: 1 | -1) => void;
}

export const Strip = ({ strip, loading, tracing, onClear, onOpenEvidence, onStep }: StripProps): ReactNode => {
  const hidden = strip === null ? null : hiddenSentence(hiddenOf(strip));
  return (
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
      {hidden === null ? null : <span className="strip-hidden">{hidden}</span>}
    </footer>
  );
};
