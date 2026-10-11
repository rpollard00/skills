import { memo, useCallback, useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import { nameOf, ownerOf, type Graph } from "../shared/graph";
import { splitFrontmatter } from "../shared/markdown";
import { relationKey, type FileRecord, type Node, type NodeId, type Relation, type RouteId } from "../shared/model";
import { byCodeUnit } from "../shared/order";
import { encodeHash } from "../shared/view/hash";
import type { Focus, Hover, Pin, Reading } from "../shared/view/state";
import { ArrowLeft, Cross } from "./icons";
import { InlineText, type LiveNames } from "./LiveName";
import { Markdown } from "./Markdown";
import { OriginFact } from "./OriginFact";
import { fetchDoc } from "./remote";

type DocState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly text: string }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "notListed" };

const textByHashAndPath = new Map<string, string>();

const cacheKey = (sha256: string, path: string): string => `${sha256}:${path}`;

const useDoc = (path: string, file: FileRecord | undefined, onIndexIsOld: () => void): { readonly doc: DocState; readonly retry: () => void } => {
  const key = file === undefined ? null : cacheKey(file.sha256, path);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ readonly key: string; readonly doc: DocState } | null>(null);

  useEffect(() => {
    if (file === undefined || key === null || textByHashAndPath.has(key)) return undefined;
    const controller = new AbortController();
    const settle = (doc: DocState): void => {
      if (!controller.signal.aborted) setAnswer({ key, doc });
    };
    fetchDoc(path, controller.signal).then(
      (result) => {
        if (result.kind !== "ok") return settle(result.kind === "notFound" ? { kind: "notListed" } : result);
        textByHashAndPath.set(cacheKey(result.value.sha256, path), result.value.text);
        settle({ kind: "ready", text: result.value.text });
        if (result.value.sha256 !== file.sha256 && !controller.signal.aborted) onIndexIsOld();
      },
      (cause: unknown) => settle({ kind: "failed", message: `The request stopped: ${String(cause)}` }),
    );
    return () => controller.abort();
  }, [key, path, file, attempt, onIndexIsOld]);

  const retry = useCallback(() => {
    setAnswer(null);
    setAttempt((count) => count + 1);
  }, []);

  const cached = key === null ? undefined : textByHashAndPath.get(key);
  const doc: DocState =
    key === null ? { kind: "notListed" } : cached !== undefined ? { kind: "ready", text: cached } : answer?.key === key ? answer.doc : { kind: "loading" };
  return { doc, retry };
};

const KIND_NAMES = { skill: "skill", playbook: "playbook", hosted: "hosted file" } as const;

interface FactsProps {
  readonly graph: Graph;
  readonly node: Node;
  readonly marked: boolean;
  readonly live: LiveNames;
  readonly onPick: (id: NodeId) => void;
  readonly onTrace: (route: RouteId) => void;
  readonly onOpen: (path: string, line: number) => void;
}

const Fact = ({ name, children }: { readonly name: string; readonly children: ReactNode }): ReactNode => (
  <>
    <dt>{name}</dt>
    <dd>{children}</dd>
  </>
);

const Facts = ({ graph, node, marked, live, onPick, onTrace, onOpen }: FactsProps): ReactNode => {
  const host = node.kind === "skill" ? undefined : graph.nodes.get(node.host);
  const routes = graph.index.routes.filter((route) => route.playbook === node.id || route.skills.includes(node.id));
  const triggers = graph.index.triggers.filter((trigger) => trigger.target === node.id);
  const directory = `${node.entry.split("/").slice(0, 2).join("/")}/`;
  const short = (path: string): string => (path.startsWith(directory) ? path.slice(directory.length) : path);
  const purpose = node.kind === "skill" ? node.description : node.kind === "playbook" ? node.purpose : node.title;

  return (
    <section className="facts" aria-label="Facts">
      <h2 className="facts-name">{nameOf(node)}</h2>
      <p className="facts-kind">
        {node.kind === "skill" && node.family !== "skill" ? node.family : KIND_NAMES[node.kind]}
        {host === undefined ? null : (
          <>
            {" of "}
            <button type="button" className="live" onClick={() => onPick(host.id)}>
              <code>{nameOf(host)}</code>
            </button>
          </>
        )}
        {graph.changed.has(node.id) ? " · changed after the last index" : ""}
      </p>
      {purpose === "" || purpose === nameOf(node) ? null : (
        <p className={marked ? "facts-purpose marked" : "facts-purpose"}>
          <InlineText text={purpose} live={live} />
        </p>
      )}
      <dl>
        {node.kind === "skill" ? (
          <>
            <Fact name="Invocation">{node.modelInvocable ? "The model can invoke it. A person or a skill can name it." : "Explicit only. A person or a skill names it."}</Fact>
            <Fact name="Origin">
              <OriginFact origin={node.origin} />
            </Fact>
          </>
        ) : null}
        {routes.length === 0 ? null : (
          <Fact name={routes.length === 1 ? "Route" : "Routes"}>
            <ul>
              {routes.map((route) => (
                <li key={route.id}>
                  <button type="button" className="text-button" onClick={() => onTrace(route.id)}>
                    {route.task}
                  </button>
                </li>
              ))}
            </ul>
          </Fact>
        )}
        {triggers.length === 0 ? null : (
          <Fact name={triggers.length === 1 ? "Trigger" : "Triggers"}>
            <ul>
              {triggers.map((trigger) => (
                <li key={`${trigger.file}:${trigger.line}`}>
                  <InlineText text={trigger.condition} live={live} />
                </li>
              ))}
            </ul>
          </Fact>
        )}
        {node.kind === "skill" && node.tooling.scripts.length > 0 ? (
          <Fact name={node.tooling.scripts.length === 1 ? "Script" : "Scripts"}>
            <ul>
              {node.tooling.scripts.map((script) => (
                <li key={script.path}>
                  <code className="tool">{short(script.path)}</code> <span className="quiet">{script.interpreter}</span>
                  {script.invokedAt.length === 0 ? (
                    <span className="quiet"> · no file of the skill names it</span>
                  ) : (
                    <>
                      <span className="quiet"> · named at </span>
                      {script.invokedAt.map((place, index) => (
                        <span key={`${place.file}:${place.line}`}>
                          {index === 0 ? "" : ", "}
                          <button type="button" className="text-button" onClick={() => onOpen(place.file, place.line)}>
                            {short(place.file)}:{place.line}
                          </button>
                        </span>
                      ))}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Fact>
        ) : null}
        {node.kind === "skill" && node.tooling.commands.length > 0 ? (
          <Fact name={node.tooling.commands.length === 1 ? "Command" : "Commands"}>
            {node.tooling.commands.map((command, index) => (
              <span key={command.name}>
                {index === 0 ? "" : ", "}
                <code className="tool">{command.name}</code> <span className="quiet">{command.uses === 1 ? "1 use" : `${command.uses} uses`}</span>
              </span>
            ))}
          </Fact>
        ) : null}
        {node.kind === "skill" && node.defects.length > 0 ? (
          <Fact name={node.defects.length === 1 ? "Defect" : "Defects"}>
            <ul>
              {node.defects.map((defect) => (
                <li key={defect}>{defect}</li>
              ))}
            </ul>
          </Fact>
        ) : null}
      </dl>
    </section>
  );
};

interface FilesProps {
  readonly graph: Graph;
  readonly owner: Node;
  readonly current: string;
  readonly hrefOf: (path: string, anchor: string | null) => string;
  readonly onFollow: (path: string, anchor: string | null) => void;
}

const Files = ({ graph, owner, current, hrefOf, onFollow }: FilesProps): ReactNode => {
  const directory = `${owner.entry.split("/").slice(0, 2).join("/")}/`;
  const groups = useMemo(() => {
    const owned = graph.index.files.filter((file) => {
      const holder = graph.nodes.get(file.owner);
      return file.owner === owner.id || (holder !== undefined && holder.kind !== "skill" && holder.host === owner.id);
    });
    const byGroup = new Map<string, FileRecord[]>();
    for (const file of owned) {
      const rest = file.path.startsWith(directory) ? file.path.slice(directory.length) : file.path;
      const group = rest.includes("/") ? `${rest.split("/")[0]}/` : "";
      byGroup.set(group, [...(byGroup.get(group) ?? []), file]);
    }
    return [...byGroup].sort(([a], [b]) => byCodeUnit(a, b)).map(([group, files]) => ({ group, files: files.sort((a, b) => byCodeUnit(a.path, b.path)) }));
  }, [graph, owner.id, directory]);

  return (
    <nav className="files" aria-label={`Files of ${nameOf(owner)}`}>
      {groups.map(({ group, files }) => (
        <div className="files-group" key={group}>
          <span className="files-directory">{group === "" ? "./" : group}</span>
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <a
                  href={hrefOf(file.path, null)}
                  aria-current={file.path === current ? "page" : undefined}
                  onClick={(event) => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onFollow(file.path, null);
                  }}
                >
                  {file.path.slice(directory.length + group.length)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

const StableMarkdown = memo(Markdown);

const evidenceLine = (relation: Relation | undefined, path: string): number | null => relation?.evidence.find((item) => item.file === path)?.line ?? null;

const hoverLine = (graph: Graph, focus: Focus, hover: Hover, path: string): number | null => {
  if (hover.kind === "cable") return evidenceLine(graph.relations.get(hover.key), path);
  if (hover.kind !== "node" || focus.kind !== "node") return null;
  return (
    evidenceLine(graph.relations.get(relationKey({ from: focus.id, to: hover.id })), path) ??
    evidenceLine(graph.relations.get(relationKey({ from: hover.id, to: focus.id })), path)
  );
};

export interface ReaderProps {
  readonly graph: Graph;
  readonly reading: Extract<Reading, { kind: "open" }>;
  /** Grows each time the reader is sent to a target. The reader scrolls to the target again when it grows. */
  readonly visit: number;
  /** The part that scrolls. */
  readonly region: RefObject<HTMLDivElement | null>;
  readonly focus: Focus;
  readonly pin: Pin;
  readonly hover: Hover;
  readonly onIndexIsOld: () => void;
  readonly onPick: (id: NodeId) => void;
  readonly onTrace: (route: RouteId) => void;
  readonly onHover: (hover: Hover) => void;
  readonly onFollow: (path: string, anchor: string | null) => void;
  readonly onOpen: (path: string, line: number) => void;
  readonly onBack: () => void;
  readonly onClose: () => void;
}

export const Reader = ({ graph, reading, visit, region, focus, pin, hover, onIndexIsOld, onPick, onTrace, onHover, onFollow, onOpen, onBack, onClose }: ReaderProps): ReactNode => {
  const { path } = reading;
  const file = graph.files.get(path);
  const { doc, retry } = useDoc(path, file, onIndexIsOld);
  const live = useMemo<LiveNames>(() => ({ names: graph.names, onPick, onHover }), [graph.names, onPick, onHover]);

  const entryOf = graph.entries.get(path);
  const subjectId = entryOf ?? file?.owner;
  const subject = subjectId === undefined ? undefined : graph.nodes.get(subjectId);
  const owner = subject === undefined ? undefined : ownerOf(graph, subject);
  const split = useMemo(() => (doc.kind === "ready" && path.endsWith(".md") ? splitFrontmatter(doc.text) : null), [doc, path]);
  const pointed = hoverLine(graph, focus, hover, path);
  const mark = pointed ?? reading.line;

  const hrefOf = useCallback(
    (target: string, anchor: string | null) => {
      const node = graph.entries.get(target);
      return encodeHash({
        focus: node === undefined ? focus : { kind: "node", id: node },
        pin,
        reading: { kind: "open", path: target, anchor, line: null, back: [] },
        query: "",
        lens: "relations",
        muted: new Set(),
      });
    },
    [graph, focus, pin],
  );

  const ready = doc.kind === "ready";
  useEffect(() => {
    const element = region.current;
    if (element === null || !ready) return;
    const target =
      reading.anchor !== null
        ? (element.querySelector(`[id="${CSS.escape(reading.anchor)}"]`) ?? element.querySelector(`[id="${CSS.escape(reading.anchor.toLowerCase())}"]`))
        : reading.line !== null
          ? element.querySelector(".marked")
          : null;
    if (target === null) element.scrollTop = 0;
    else target.scrollIntoView({ block: reading.anchor !== null ? "start" : "center" });
  }, [ready, path, reading.anchor, reading.line, visit, region]);

  useEffect(() => {
    if (pointed !== null) region.current?.querySelector(".marked")?.scrollIntoView({ block: "nearest" });
  }, [pointed, region]);

  const previous = reading.back.at(-1);
  return (
    <aside className="reader" aria-label="Reader">
      <header className="reader-bar">
        {previous === undefined ? null : (
          <button type="button" className="key-button" aria-label={`Back to ${previous}`} onClick={onBack}>
            <ArrowLeft />
          </button>
        )}
        <span className="reader-path" title={path}>
          <bdo dir="ltr">{path}</bdo>
        </span>
        <button type="button" className="key-button" aria-label="Close the reader" onClick={onClose}>
          <Cross />
        </button>
      </header>
      <div className="reader-scroll" ref={region} tabIndex={-1} role="region" aria-label={`Text of ${path}`}>
        {subject === undefined || owner === undefined ? null : (
          <>
            {entryOf === undefined ? (
              <section className="facts" aria-label="Facts">
                <h2 className="facts-name">{path.split("/").at(-1)}</h2>
                <p className="facts-kind">
                  {"file of "}
                  <button type="button" className="live" onClick={() => onPick(subject.id)}>
                    <code>{nameOf(subject)}</code>
                  </button>
                </p>
              </section>
            ) : (
              <Facts
                graph={graph}
                node={subject}
                marked={mark !== null && split !== null && mark < split.bodyLine}
                live={live}
                onPick={onPick}
                onTrace={onTrace}
                onOpen={onOpen}
              />
            )}
            <Files graph={graph} owner={owner} current={path} hrefOf={hrefOf} onFollow={onFollow} />
          </>
        )}
        <article className="doc" aria-busy={doc.kind === "loading"}>
          {doc.kind === "loading" ? <p className="doc-state">Reading {path}.</p> : null}
          {doc.kind === "notListed" ? (
            <p className="doc-state" role="status">
              The index does not list <code>{path}</code>. The reader shows only the files below <code>skills/</code> that the scan found.
            </p>
          ) : null}
          {doc.kind === "failed" ? (
            <p className="doc-state" role="alert">
              <InlineText text={doc.message} />{" "}
              <button type="button" className="text-button" onClick={retry}>
                Retry
              </button>
            </p>
          ) : null}
          {doc.kind === "ready" && split !== null ? (
            <StableMarkdown
              text={split.body}
              path={path}
              firstLine={split.bodyLine}
              names={graph.names}
              mark={mark}
              hrefOf={hrefOf}
              onPick={onPick}
              onHover={onHover}
              onFollow={onFollow}
            />
          ) : null}
          {doc.kind === "ready" && split === null ? <pre className="source">{doc.text}</pre> : null}
        </article>
      </div>
    </aside>
  );
};
