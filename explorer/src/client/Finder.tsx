import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { nameOf, type Graph } from "../shared/graph";
import type { Node, NodeId, RouteId } from "../shared/model";
import type { FinderHit } from "../shared/view/finder";
import type { Hover } from "../shared/view/state";
import { Cross } from "./icons";
import { InlineText } from "./LiveName";
import { count } from "./count";

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
  readonly graph: Graph;
  /** The index is not there yet. */
  readonly idle: boolean;
  readonly query: string;
  readonly hits: readonly FinderHit[];
  readonly onType: (query: string) => void;
  readonly onPick: (id: NodeId) => void;
  readonly onTrace: (route: RouteId) => void;
  readonly onHover: (hover: Hover) => void;
}

export const Finder = ({ input, graph, idle, query, hits, onType, onPick, onTrace, onHover }: FinderProps): ReactNode => {
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

  return (
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
  );
};
