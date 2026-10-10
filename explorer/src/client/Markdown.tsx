import { Children, createContext, isValidElement, useContext, useMemo, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import { blocks, plainText, resolveLink, slugger, type Block } from "../shared/markdown";
import type { NodeId } from "../shared/model";
import type { Hover } from "../shared/view/state";
import { LiveName, namedSkill, type LiveNames } from "./LiveName";

export interface MarkdownProps {
  /** The body of the document, without frontmatter. */
  readonly text: string;
  /** Path of the document. Relative links resolve against it. */
  readonly path: string;
  /** Line of the file that holds the first line of `text`. */
  readonly firstLine: number;
  /** Skill names. A code span with one of these names is live. */
  readonly names: ReadonlyMap<string, NodeId>;
  /** A line of the file to mark: the evidence of a relation. */
  readonly mark: number | null;
  /** The address of a file of the repository inside this app. */
  readonly hrefOf: (path: string, anchor: string | null) => string;
  readonly onPick: (id: NodeId) => void;
  readonly onHover: (hover: Hover) => void;
  readonly onFollow: (path: string, anchor: string | null) => void;
}

/**
 * What each part of one document reads. It changes with the document and with the focus, because each address holds the focus.
 * It does not change with the mark, so a mark from the pointer does not reach the links and the names.
 */
interface OpenDocument extends LiveNames {
  readonly path: string;
  readonly firstLine: number;
  readonly hrefOf: MarkdownProps["hrefOf"];
  readonly onFollow: MarkdownProps["onFollow"];
  /** First line of each heading to the slug that GitHub gives it. */
  readonly headingIdByLine: ReadonlyMap<number, string>;
}

const OpenDocumentContext = createContext<OpenDocument | null>(null);

/** First line of the block that holds the marked line. Null when no line is marked. */
const MarkedBlockLineContext = createContext<number | null>(null);

const useOpenDocument = (): OpenDocument => {
  const open = useContext(OpenDocumentContext);
  if (open === null) throw new Error("A markdown part is outside its document.");
  return open;
};

const useBlockLine = (node: ExtraProps["node"]): { readonly line: number | undefined; readonly isMarked: boolean } => {
  const open = useOpenDocument();
  const markedBlockLine = useContext(MarkedBlockLineContext);
  const line = node?.position === undefined ? undefined : node.position.start.line + open.firstLine - 1;
  return { line, isMarked: line !== undefined && line === markedBlockLine };
};

interface BlockProps extends ExtraProps {
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

const withMark = (className: string | undefined, isMarked: boolean): string | undefined =>
  isMarked ? (className === undefined ? "marked" : `${className} marked`) : className;

type BlockTag = "p" | "blockquote" | "pre" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** A block knows its line in the file, so the reader can mark the evidence of a relation. */
const block = (Tag: BlockTag) =>
  function Block({ node, children, className }: BlockProps): ReactNode {
    const open = useOpenDocument();
    const { line, isMarked } = useBlockLine(node);
    return (
      <Tag id={Tag.startsWith("h") && line !== undefined ? open.headingIdByLine.get(line) : undefined} data-line={line} className={withMark(className, isMarked)}>
        {children}
      </Tag>
    );
  };

const isNestedList = (child: ReactNode): boolean => isValidElement(child) && (child.type === "ul" || child.type === "ol");

/** The mark of a list item covers the text of the item. The items below it are blocks of their own. */
const ListItem = ({ node, children, className }: BlockProps): ReactNode => {
  const { line, isMarked } = useBlockLine(node);
  if (!isMarked) {
    return (
      <li data-line={line} className={className}>
        {children}
      </li>
    );
  }
  const parts = Children.toArray(children);
  const firstNested = parts.findIndex(isNestedList);
  const ownText = firstNested === -1 ? parts : parts.slice(0, firstNested);
  return (
    <li data-line={line} className={className}>
      <div className="marked">{ownText}</div>
      {firstNested === -1 ? null : parts.slice(firstNested)}
    </li>
  );
};

const textOf = (children: ReactNode): string | null =>
  typeof children === "string" ? children : Array.isArray(children) && children.every((child) => typeof child === "string") ? children.join("") : null;

const Code = ({ node: _node, children, ...rest }: ComponentPropsWithoutRef<"code"> & ExtraProps): ReactNode => {
  const open = useOpenDocument();
  const text = textOf(children);
  const id = text === null ? undefined : namedSkill(text, open.names);
  if (id === undefined) return <code {...rest}>{children}</code>;
  return (
    <LiveName id={id} live={open}>
      {children}
    </LiveName>
  );
};

/** A relative link opens in the reader. An `http(s)` link opens a new tab. A link with a different scheme is plain text. */
const Link = ({ node: _node, href, children, title }: ComponentPropsWithoutRef<"a"> & ExtraProps): ReactNode => {
  const open = useOpenDocument();
  const target = resolveLink({ from: open.path, href: href ?? "" });
  switch (target.kind) {
    case "external":
      return (
        <a href={target.url} target="_blank" rel="noreferrer noopener" title={title}>
          {children}
        </a>
      );
    case "file":
    case "anchor": {
      const path = target.kind === "file" ? target.path : open.path;
      const follow = (event: MouseEvent): void => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        open.onFollow(path, target.anchor);
      };
      return (
        <a href={open.hrefOf(path, target.anchor)} data-doc={path} title={title} onClick={follow}>
          {children}
        </a>
      );
    }
    case "other":
      return <span className="plain-link">{children}</span>;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
};

/** An image in a skill file can name any host. The reader makes no request for it and shows the alternative text. */
const ImageAsAlternativeText = ({ alt }: ComponentPropsWithoutRef<"img"> & ExtraProps): ReactNode => <span className="plain-link">{alt}</span>;

const COMPONENTS: Components = {
  p: block("p"),
  li: ListItem,
  blockquote: block("blockquote"),
  pre: block("pre"),
  h1: block("h1"),
  h2: block("h2"),
  h3: block("h3"),
  h4: block("h4"),
  h5: block("h5"),
  h6: block("h6"),
  code: Code,
  a: Link,
  img: ImageAsAlternativeText,
};

interface TreeNode {
  type: string;
  value?: unknown;
  position?: unknown;
  children?: TreeNode[];
  tagName?: string;
  properties?: { [name: string]: unknown };
}

/**
 * `react-markdown` has no raw-HTML plugin here, so it shows HTML source as text. A placeholder such as `<JUDGMENT_OUTPUT>`
 * on a line of its own is an HTML block. This step puts that text in a paragraph so that it reads as a line of the document.
 */
const htmlBlocksAsText = () => (tree: TreeNode): void => {
  if (tree.children === undefined) return;
  tree.children = tree.children.map((child) =>
    child.type === "raw"
      ? { type: "element", tagName: "p", properties: { className: ["html-text"] }, children: [{ type: "text", value: child.value }], position: child.position }
      : child,
  );
};

const REHYPE = [htmlBlocksAsText];

const headingIds = (documentBlocks: readonly Block[]): Map<number, string> => {
  const slug = slugger();
  const ids = new Map<number, string>();
  for (const item of documentBlocks) if (item.kind === "heading") ids.set(item.line, slug(plainText(item.text)));
  return ids;
};

/**
 * The first line of the block that holds a line of the file. A fence holds each line from its opening mark to its
 * closing mark: a line of a command in a fence marks the fence.
 */
const blockLineHolding = (documentBlocks: readonly Block[], line: number | null): number | null => {
  if (line === null) return null;
  const holder = documentBlocks.findLast((item) => {
    const lineCount = item.kind === "fence" ? item.lines.length + 2 : item.text.split("\n").length;
    return item.line <= line && line < item.line + lineCount;
  });
  return holder?.line ?? null;
};

/**
 * There is no raw-HTML plugin and no `dangerouslySetInnerHTML`: HTML in the source shows as text.
 * The parsed document and its blocks are kept while the text is the same. The marked line goes through a context
 * of its own, so a new mark renders the blocks again and parses nothing.
 */
export const Markdown = ({ text, mark, firstLine, path, names, hrefOf, onPick, onHover, onFollow }: MarkdownProps): ReactNode => {
  const documentBlocks = useMemo(() => blocks(text, firstLine), [text, firstLine]);
  const open = useMemo<OpenDocument>(
    () => ({ firstLine, path, names, hrefOf, onPick, onHover, onFollow, headingIdByLine: headingIds(documentBlocks) }),
    [documentBlocks, firstLine, path, names, hrefOf, onPick, onHover, onFollow],
  );
  const markedBlockLine = useMemo(() => blockLineHolding(documentBlocks, mark), [documentBlocks, mark]);
  const parsed = useMemo(
    () => (
      <ReactMarkdown components={COMPONENTS} rehypePlugins={REHYPE}>
        {text}
      </ReactMarkdown>
    ),
    [text],
  );
  return (
    <OpenDocumentContext value={open}>
      <MarkedBlockLineContext value={markedBlockLine}>{parsed}</MarkedBlockLineContext>
    </OpenDocumentContext>
  );
};
