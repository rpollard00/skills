import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { nameOf, type Graph } from "../shared/graph";
import type { ExplorerIndex, Node, NodeId, RouteId } from "../shared/model";
import type { FinderHit } from "../shared/view/finder";
import { LENSES, type Hover, type Lens } from "../shared/view/state";
import { Cross, FitFrame } from "./icons";
import { InlineText } from "./LiveName";
import type { LoadState } from "./useIndex";

const count = (value: number, one: string, many: string): string => `${value} ${value === 1 ? one : many}`;

const LENS_NAMES: { readonly [Name in Lens]: string } = { relations: "Relations", tools: "Tools" };

const UPDATE = (
  <>
    Run the <code>update-skill-explorer</code> skill.
  </>
);

const recordStatus = (record: ExplorerIndex["record"]): ReactNode => {
  switch (record.kind) {
    case "current":
      return <span className="status-part">Index current</span>;
    case "missing":
      return (
        <span className="status-part status-alert">
          <StatusMark />
          No index record. {UPDATE}
        </span>
      );
    case "behind": {
      const changes = record.added.length + record.changed.length + record.removed.length;
      return (
        <span className="status-part status-alert">
          <StatusMark />
          {changes === 0
            ? "Index behind: the record has a different format. "
            : `Index behind: ${record.added.length} added, ${record.changed.length} changed, ${record.removed.length} removed. `}
          {UPDATE}
        </span>
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
    <circle r={4.5} />
  </svg>
);

const excerpt = (text: string, query: string): string => {
  const token = query.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const at = Math.max(0, text.toLowerCase().indexOf(token));
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - 28)) + 1);
  const cut = text.slice(start, start + 84);
  return `${start > 0 ? "…" : ""}${cut}${start + 84 < text.length ? "…" : ""}`;
};

const detailOf = (node: Node, field: "name" | "title" | "description", query: string): string => {
  if (field === "title") return node.title;
  const purpose = node.kind === "skill" ? node.description : node.kind === "playbook" ? node.purpose : node.title;
  return field === "description" ? excerpt(purpose, query) : purpose;
};

interface Row {
  readonly key: string;
  readonly tag: string;
  readonly text: string;
  readonly detail: string;
  readonly node: NodeId | null;
  readonly run: () => void;
}

export interface FinderProps {
  readonly input: RefObject<HTMLInputElement | null>;
  /** The control of the Key. The focus returns to it when the Key closes. */
  readonly keyControl: RefObject<HTMLButtonElement | null>;
  readonly graph: Graph;
  readonly load: LoadState;
  readonly query: string;
  readonly hits: readonly FinderHit[];
  readonly lens: Lens;
  readonly legendOpen: boolean;
  readonly fitted: boolean;
  readonly onType: (query: string) => void;
  readonly onPick: (id: NodeId) => void;
  readonly onTrace: (route: RouteId) => void;
  readonly onHover: (hover: Hover) => void;
  readonly onLens: (lens: Lens) => void;
  readonly onFit: () => void;
  readonly onLegend: (open: boolean) => void;
  readonly onRetry: () => void;
}

/** The top bar: the query and its hits, the lens, the key, the camera, and the state of the index. */
export const Finder = ({
  input,
  keyControl,
  graph,
  load,
  query,
  hits,
  lens,
  legendOpen,
  fitted,
  onType,
  onPick,
  onTrace,
  onHover,
  onLens,
  onFit,
  onLegend,
  onRetry,
}: FinderProps): ReactNode => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement | null>(null);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const rows: Row[] = hits.flatMap((hit): Row[] => {
    if (hit.kind === "route") {
      const route = graph.routes.get(hit.route);
      if (route === undefined) return [];
      const to = [route.playbook, ...route.skills].flatMap((id) => (id === null ? [] : [graph.nodes.get(id)])).flatMap((node) => (node === undefined ? [] : [nameOf(node)]));
      return [{ key: `route:${hit.route}`, tag: "route", text: route.task, detail: to.join(", "), node: route.playbook ?? route.skills[0] ?? null, run: () => onTrace(hit.route) }];
    }
    const node = graph.nodes.get(hit.kind === "node" ? hit.id : hit.target);
    if (node === undefined) return [];
    return hit.kind === "trigger"
      ? [{ key: `trigger:${hit.target}:${hit.condition}`, tag: "trigger", text: hit.condition, detail: nameOf(node), node: node.id, run: () => onPick(node.id) }]
      : [{ key: `node:${hit.id}`, tag: node.kind === "skill" ? node.family : node.kind, text: nameOf(node), detail: detailOf(node, hit.field, query), node: node.id, run: () => onPick(node.id) }];
  });
  const searching = query.trim() !== "";
  const showing = open && searching && rows.length > 0;

  const choose = (row: Row | undefined): void => {
    if (row === undefined) return;
    row.run();
    setOpen(false);
    onHover({ kind: "none" });
    input.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (rows.length === 0) return;
      const next = (active + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length;
      setOpen(true);
      setActive(next);
      const node = rows[next]?.node;
      onHover(node === null || node === undefined ? { kind: "none" } : { kind: "node", id: node });
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(rows[active]);
    }
  };

  const index = load.kind === "ready" ? load.graph.index : null;
  const idle = index === null;
  return (
    <header className="bar">
      <div className="finder">
        <span className="finder-key" aria-hidden="true">
          /
        </span>
        <input
          ref={input}
          className="finder-input"
          id="finder-query"
          name="query"
          type="text"
          role="combobox"
          aria-label="Find a skill, a route, or a trigger"
          aria-expanded={showing}
          aria-controls="finder-hits"
          aria-activedescendant={showing ? `finder-hit-${active}` : undefined}
          placeholder="Find a skill, a route, or a trigger"
          autoComplete="off"
          spellCheck={false}
          disabled={idle}
          value={query}
          onChange={(event) => {
            onType(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            onHover({ kind: "none" });
          }}
          onKeyDown={onKeyDown}
        />
        {searching ? (
          <>
            <span className="finder-count" aria-live="polite">
              {count(rows.length, "hit", "hits")}
            </span>
            <button type="button" className="key-button" aria-label="Clear the query" onClick={() => onType("")}>
              <Cross />
            </button>
          </>
        ) : null}
        {showing ? (
          <ul className="hits" id="finder-hits" role="listbox" aria-label="Hits" ref={list}>
            {rows.map((row, position) => (
              <li
                key={row.key}
                id={`finder-hit-${position}`}
                role="option"
                aria-selected={position === active}
                onPointerDown={(event) => event.preventDefault()}
                onPointerEnter={() => {
                  setActive(position);
                  onHover(row.node === null ? { kind: "none" } : { kind: "node", id: row.node });
                }}
                onClick={() => choose(row)}
              >
                <span className="hit-tag">{row.tag}</span>
                <span className="hit-name">{row.text}</span>
                <span className="hit-detail">
                  <InlineText text={row.detail} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="segments" role="group" aria-label="Lens">
        {LENSES.map((name) => (
          <button key={name} type="button" className="segment" aria-pressed={lens === name} disabled={idle} onClick={() => onLens(name)}>
            {LENS_NAMES[name]}
          </button>
        ))}
      </div>
      <button type="button" className="segment" ref={keyControl} aria-pressed={legendOpen} disabled={idle} onClick={() => onLegend(!legendOpen)}>
        Key
      </button>
      <button type="button" className="segment icon-segment" aria-label="Fit the map to the window" aria-pressed={fitted} disabled={idle} onClick={onFit}>
        <FitFrame />
        Fit
      </button>

      <div className="status" role="status">
        {load.kind === "ready" && load.problem !== null ? (
          <span className="status-part status-alert">
            <StatusMark />
            The map can be old. {load.problem}{" "}
            <button type="button" className="text-button" onClick={onRetry}>
              Retry
            </button>
          </span>
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
