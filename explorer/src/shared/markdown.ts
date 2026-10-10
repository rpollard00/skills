/** No dependency on Node, so the client can import it. */

interface SplitDocument {
  /** The YAML between the two `---` lines, or null when the file has no frontmatter. */
  readonly frontmatter: string | null;
  readonly body: string;
  /** 1-based line number of the first body line. */
  readonly bodyLine: number;
}

/** Only the first closing `---` ends the frontmatter. Later `---` lines are horizontal rules. */
export const splitFrontmatter = (text: string): SplitDocument => {
  const whole: SplitDocument = { frontmatter: null, body: text, bodyLine: 1 };
  if (!text.startsWith("---\n")) return whole;
  const inner = text.indexOf("\n---\n", 3);
  const close = inner === -1 && text.endsWith("\n---") ? text.length - 4 : inner;
  if (close === -1) return whole;
  const frontmatter = text.slice(4, close + 1);
  return {
    frontmatter,
    body: text.slice(close + 5),
    bodyLine: frontmatter.split("\n").length + 2,
  };
};

export type Block =
  | { readonly kind: "heading"; readonly line: number; readonly depth: number; readonly text: string }
  | { readonly kind: "paragraph" | "item"; readonly line: number; readonly text: string }
  | { readonly kind: "fence"; readonly line: number; readonly info: string; readonly lines: readonly string[] };

/** CommonMark: the info string of a backtick fence holds no backtick. A line that fails this is inline code. */
const FENCE = /^\s*(?:(`{3,})([^`]*)|(~{3,})(.*))$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?/;

const unquote = (line: string): string => {
  let rest = line;
  while (QUOTE.test(rest)) rest = rest.replace(QUOTE, "");
  return rest;
};

/** A list item holds its own lines and not its nested items. `line` is the block's first line in the file. */
export const blocks = (body: string, firstLine = 1): Block[] => {
  const out: Block[] = [];
  let open: { kind: "paragraph" | "item"; line: number; lines: string[] } | null = null;
  const flush = (): void => {
    if (open !== null) out.push({ kind: open.kind, line: open.line, text: open.lines.join("\n") });
    open = null;
  };

  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = unquote(lines[index] ?? "");
    const lineNumber = firstLine + index;

    const fence = FENCE.exec(line);
    if (fence !== null) {
      flush();
      const marker = fence[1] ?? fence[3] ?? "";
      const info = (fence[2] ?? fence[4] ?? "").trim().split(/\s+/, 1)[0] ?? "";
      const content: string[] = [];
      index += 1;
      for (; index < lines.length; index += 1) {
        const inner = unquote(lines[index] ?? "");
        const close = /^\s*(`{3,}|~{3,})\s*$/.exec(inner)?.[1];
        if (close !== undefined && close.startsWith(marker[0] ?? "`") && close.length >= marker.length) break;
        content.push(inner);
      }
      out.push({ kind: "fence", line: lineNumber, info, lines: content });
      continue;
    }

    if (line.trim() === "" || RULE.test(line)) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading !== null) {
      flush();
      out.push({ kind: "heading", line: lineNumber, depth: (heading[1] ?? "#").length, text: heading[2] ?? "" });
      continue;
    }

    const item = ITEM.exec(line);
    if (item !== null) {
      flush();
      open = { kind: "item", line: lineNumber, lines: [item[1] ?? ""] };
    } else if (open === null) {
      open = { kind: "paragraph", line: lineNumber, lines: [line.trim()] };
    } else {
      open.lines.push(line.trim());
    }
  }
  flush();
  return out;
};

export interface Span {
  readonly start: number;
  readonly end: number;
}

interface CodeSpan extends Span {
  readonly content: string;
}

/** A code span opens with a run of backticks and closes at the next run of the same length. */
export const codeSpans = (text: string): CodeSpan[] => {
  const out: CodeSpan[] = [];
  const runs = [...text.matchAll(/`+/g)];
  for (let index = 0; index < runs.length; index += 1) {
    const opener = runs[index];
    if (opener === undefined) continue;
    const closerIndex = runs.findIndex((run, at) => at > index && run[0].length === opener[0].length);
    const closer = closerIndex === -1 ? undefined : runs[closerIndex];
    if (closer === undefined) continue;
    const inner = text.slice(opener.index + opener[0].length, closer.index);
    const padded = inner.length > 2 && inner.startsWith(" ") && inner.endsWith(" ") && inner.trim() !== "";
    out.push({
      start: opener.index,
      end: closer.index + closer[0].length,
      content: padded ? inner.slice(1, -1) : inner,
    });
    index = closerIndex;
  }
  return out;
};

export interface Link extends Span {
  readonly label: string;
  readonly href: string;
  /** Offsets of the `(href)` part, so a caller can blank it. */
  readonly target: Span;
}

const LINK = /!?\[((?:[^\]\n`]|`[^`\n]*`)*)\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g;

export const isInsideSpan = (spans: readonly Span[], at: number): boolean => spans.some((span) => at >= span.start && at < span.end);

/** Each run of white space becomes one space. */
export const collapseWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim();

/** Inline links and images. A link that starts inside a code span is code, not a link. */
export const links = (text: string): Link[] => {
  const code = codeSpans(text);
  const out: Link[] = [];
  for (const match of text.matchAll(LINK)) {
    if (isInsideSpan(code, match.index)) continue;
    const label = match[1] ?? "";
    const end = match.index + match[0].length;
    const labelStart = match.index + (match[0].startsWith("!") ? 2 : 1);
    out.push({ start: match.index, end, label, href: match[2] ?? "", target: { start: labelStart + label.length + 1, end } });
  }
  return out;
};

/** Replaces each span with spaces. Offsets and line breaks stay where they were. */
const blank = (text: string, spans: readonly Span[]): string => {
  let out = text;
  for (const span of spans) {
    const hidden = out.slice(span.start, span.end).replace(/[^\n]/g, " ");
    out = out.slice(0, span.start) + hidden + out.slice(span.end);
  }
  return out;
};

/** The text a reader sees as prose: no code spans and no link destinations. Link labels stay. */
export const proseOnly = (text: string): string =>
  blank(text, [...codeSpans(text), ...links(text).map((link) => link.target)]);

/** 0-based line offset of a position inside a block's text. */
export const lineOffset = (text: string, at: number): number => {
  let count = 0;
  for (let index = text.indexOf("\n"); index !== -1 && index < at; index = text.indexOf("\n", index + 1)) count += 1;
  return count;
};

/** GitHub's heading slug: lower case, punctuation removed, each space becomes a hyphen. */
export const slug = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");

/** Slugs for one document. A repeated heading gets `-1`, `-2`, and so on, as on GitHub. */
export const slugger = (): ((heading: string) => string) => {
  const seen = new Map<string, number>();
  return (heading) => {
    const base = slug(heading);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
};

/** The text of a heading as a reader sees it: no emphasis marks, no backticks, link labels only. */
export const plainText = (markdown: string): string =>
  markdown
    .replace(/!?\[((?:[^\]\n`]|`[^`\n]*`)*)\]\([^)]*\)/g, "$1")
    .replace(/`+/g, "")
    .replace(/(\*\*|__|\*|_)(?=\S)(.+?)(?<=\S)\1/g, "$2")
    .trim();

type ResolvedLink =
  | { readonly kind: "file"; readonly path: string; readonly anchor: string | null }
  | { readonly kind: "anchor"; readonly anchor: string }
  | { readonly kind: "external"; readonly url: string }
  | { readonly kind: "other" };

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * `from` is a POSIX path relative to the repository root.
 * A `file` result is a normalized path. It can point outside `skills/`, so the caller must look it up before use.
 */
export const resolveLink = (link: { readonly from: string; readonly href: string }): ResolvedLink => {
  const href = link.href.trim();
  if (/^https?:\/\//i.test(href)) return { kind: "external", url: href };
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return { kind: "other" };

  const hash = href.indexOf("#");
  const anchor = hash === -1 ? null : decode(href.slice(hash + 1));
  const target = decode(hash === -1 ? href : href.slice(0, hash));
  if (target === "") return anchor === null ? { kind: "other" } : { kind: "anchor", anchor };

  const base = target.startsWith("/") ? [] : link.from.split("/").slice(0, -1);
  const parts: string[] = [];
  for (const part of [...base, ...target.split("/")]) {
    if (part === "" || part === ".") continue;
    if (part !== "..") parts.push(part);
    else if (parts.pop() === undefined) return { kind: "other" };
  }
  return parts.length === 0 ? { kind: "other" } : { kind: "file", path: parts.join("/"), anchor };
};
