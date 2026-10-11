import type { ReactNode, RefObject } from "react";
import type { ExplorerIndex } from "../shared/model";
import { LOCK_KEY } from "../shared/view/keys";
import { LENSES, type Lens } from "../shared/view/state";
import { Finder, type FinderProps } from "./Finder";
import { FitFrame, LockClosed, LockOpen } from "./icons";
import { InlineText } from "./LiveName";
import type { LoadState } from "./useIndex";
import { count } from "./count";

const LENS_NAMES: { readonly [Name in Lens]: string } = { relations: "Relations", tools: "Tools" };

const UPDATE = (
  <>
    Run the <code>update-skill-explorer</code> skill.
  </>
);

/**
 * `children`: the text of the alert. It is in one element, because the alert is a row with a gap between its parts:
 * a code span that is a part of its own gets that gap before the comma or the period that follows it.
 */
const StatusAlert = ({ children, action }: { readonly children: ReactNode; readonly action?: ReactNode }): ReactNode => (
  <span className="status-part status-alert">
    <StatusMark />
    <span className="status-text">{children}</span>
    {action}
  </span>
);

const recordStatus = (record: ExplorerIndex["record"]): ReactNode => {
  switch (record.kind) {
    case "current":
      return <span className="status-part">Index current</span>;
    case "missing":
      return <StatusAlert>No index record. {UPDATE}</StatusAlert>;
    case "behind": {
      const changes = record.added.length + record.changed.length + record.removed.length;
      return (
        <StatusAlert>
          {changes === 0
            ? "Index behind: the record has a different format. "
            : `Index behind: ${record.added.length} added, ${record.changed.length} changed, ${record.removed.length} removed. `}
          {UPDATE}
        </StatusAlert>
      );
    }
    default: {
      const _exhaustive: never = record;
      return _exhaustive;
    }
  }
};

const StatusMark = (): ReactNode => (
  <svg className="status-mark" width={12} height={12} viewBox="-6 -6 12 12" aria-hidden="true" focusable="false">
    <path d="M-4.2,3.6L0,-3.8L4.2,3.6Z" />
  </svg>
);

export interface TopBarProps extends Omit<FinderProps, "idle"> {
  readonly legendControl: RefObject<HTMLButtonElement | null>;
  readonly load: LoadState;
  readonly lens: Lens;
  readonly legendOpen: boolean;
  readonly fitted: boolean;
  readonly locked: boolean;
  readonly onLens: (lens: Lens) => void;
  readonly onFit: () => void;
  readonly onLock: () => void;
  readonly onLegend: (open: boolean) => void;
  readonly onRetry: () => void;
}

export const TopBar = ({ legendControl, load, lens, legendOpen, fitted, locked, onLens, onFit, onLock, onLegend, onRetry, ...finder }: TopBarProps): ReactNode => {
  const index = load.kind === "ready" ? load.graph.index : null;
  const idle = index === null;
  return (
    <header className="bar">
      <Finder {...finder} idle={idle} />

      <div className="segments" role="group" aria-label="Lens">
        {LENSES.map((name) => (
          <button key={name} type="button" className="segment" aria-pressed={lens === name} disabled={idle} onClick={() => onLens(name)}>
            {LENS_NAMES[name]}
          </button>
        ))}
      </div>
      <button type="button" className="segment" ref={legendControl} aria-pressed={legendOpen} disabled={idle} onClick={() => onLegend(!legendOpen)}>
        Key
      </button>
      <div className="segments" role="group" aria-label="Stage">
        <button type="button" className="segment" aria-label="Fit the map to the window" aria-pressed={fitted} disabled={idle} onClick={onFit}>
          <FitFrame />
          Fit
        </button>
        <button
          type="button"
          className="segment"
          aria-label="Lock each node in its place"
          aria-pressed={locked}
          aria-keyshortcuts={LOCK_KEY}
          title={locked ? "Each node stays in its place. A click changes what is lit. Key: L" : "Lock each node in its place. Key: L"}
          disabled={idle}
          onClick={onLock}
        >
          {locked ? <LockClosed /> : <LockOpen />}
          Lock
        </button>
      </div>

      <div className="status" role="status">
        {load.kind === "ready" && load.problem !== null ? (
          <StatusAlert
            action={
              <button type="button" className="text-button" onClick={onRetry}>
                Retry
              </button>
            }
          >
            The map can be old. <InlineText text={load.problem} />
          </StatusAlert>
        ) : null}
        {index === null ? null : (
          <>
            {recordStatus(index.record)}
            <span className="status-part">{count(index.open, "open ticket", "open tickets")}</span>
            {index.orphans === 0 ? null : <span className="status-part">{count(index.orphans, "orphan judgment", "orphan judgments")}</span>}
          </>
        )}
      </div>
    </header>
  );
};
