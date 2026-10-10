import { nameOf } from "../graph";
import { plainText } from "../markdown";
import type { Evidence, Node } from "../model";

const OPENS_A_SENTENCE = /[\p{Lu}`[*("“]/u;

/**
 * A mark ends a sentence when the text ends there, or when a space and then a capital letter, a code span,
 * a bracket, or a quote follows. So the periods in `a.b.md`, in `e.g. the`, and in `v1.2` end nothing.
 */
const endsSentence = (text: string, at: number): boolean => {
  const next = text[at + 1];
  if (next === undefined) return true;
  const afterSpace = text[at + 2];
  return next === " " && afterSpace !== undefined && OPENS_A_SENTENCE.test(afterSpace);
};

const sentencesOf = (text: string): string[] => {
  const out: string[] = [];
  let start = 0;
  let inCode = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "`") inCode = !inCode;
    if (inCode || (char !== "." && char !== "?" && char !== "!") || !endsSentence(text, index)) continue;
    out.push(text.slice(start, index + 1).trim());
    start = index + 1;
  }
  const rest = text.slice(start).trim();
  if (rest !== "") out.push(rest);
  return out;
};

const SENTENCE_LIMIT = 220;

export const cutAtWord = (text: string): string => {
  if (text.length <= SENTENCE_LIMIT) return text;
  const head = text.slice(0, SENTENCE_LIMIT);
  const space = head.lastIndexOf(" ");
  return `${head.slice(0, space > SENTENCE_LIMIT / 2 ? space : SENTENCE_LIMIT).replace(/[\s,;:]+$/, "")}…`;
};

/** The sentence of the block that names the target, as a reader sees it, cut at a word when it is long. */
export const sentenceOf = (evidence: Evidence, target: Node): string => {
  const sentences = sentencesOf(evidence.text);
  const file = target.entry.split("/").at(-1) ?? target.entry;
  const names = [nameOf(target), target.kind === "skill" ? target.name.replace(/^principle-/, "") : file, file, target.title].map((name) => name.toLowerCase());
  const found = names.flatMap((name) => sentences.filter((sentence) => sentence.toLowerCase().includes(name)))[0];
  return cutAtWord(plainText(found ?? sentences[0] ?? evidence.text));
};
