/**
 * Counts the relation words over each locked stage of the snapshot, with each pick and each trace on it, at two sizes of the window, with the reader open and closed.
 * It prints the numbers that the README states for a locked view. Run it after a refresh of the snapshot.
 *
 * Usage, in `explorer/`: npx tsx test/recount-words.ts [--list] [--pin]
 * `--list` prints each word that breaks a rule. `--pin` writes `test/words-left-off.ts`, which `lock.test.ts` compares with the snapshot.
 */
import { writeFileSync } from "node:fs";
import nodePath from "node:path";
import { toGraph, type Graph } from "../src/shared/graph";
import { layout } from "../src/shared/layout";
import { relationKey, type NodeId } from "../src/shared/model";
import { deriveScene, type Scene } from "../src/shared/view/scene";
import { INITIAL, type Stage, type StageTarget, type ViewEvent, type ViewState } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import { snapshotIndex } from "./support";
import { coveredByChips, isInside, litOf, overlap, strangersUnder, thingsOf, visibleRectOf, wordBoxesOf, wordsUnderNames } from "./word-rules";

const SIZES = [
  { name: "1440x826", viewport: { width: 1440, height: 826, reader: 461 } },
  { name: "1920x1000", viewport: { width: 1920, height: 1000, reader: 600 } },
] as const;

const lists = process.argv.includes("--list");
const graph: Graph = toGraph(snapshotIndex);
const placement = layout(graph);

const run = (stage: Stage, events: readonly ViewEvent[], from: ViewState = INITIAL): ViewState => events.reduce((state, event) => step(state, event, stage), from);

const stages: StageTarget[] = [
  { kind: "rest" },
  ...graph.index.nodes.map((node): StageTarget => ({ kind: "node", id: node.id })),
  ...graph.index.routes.map((route): StageTarget => ({ kind: "route", route: route.id })),
];
const nameOf = (target: StageTarget): string => (target.kind === "rest" ? "the rest map" : target.kind === "node" ? target.id : `route ${target.route}`);
const selects = (target: StageTarget): ViewEvent[] => (target.kind === "rest" ? [] : target.kind === "node" ? [{ kind: "picked", id: target.id }] : [{ kind: "traced", route: target.route }]);

interface Totals {
  scenes: number;
  lit: number;
  onTheWire: number;
  besideOrUnder: number;
  relationBack: number;
  noWord: number;
  boxes: number;
  outsideTheView: number;
  scenesWithAWordOutsideTheView: number;
  onALineOfADifferentRelation: number;
  scenesWithSuchAWord: number;
  underAName: number;
  underANameAndOverALitRow: number;
  overAThing: number;
  overAWord: number;
}

const zero = (): Totals => ({ scenes: 0, lit: 0, onTheWire: 0, besideOrUnder: 0, relationBack: 0, noWord: 0, boxes: 0, outsideTheView: 0, scenesWithAWordOutsideTheView: 0, onALineOfADifferentRelation: 0, scenesWithSuchAWord: 0, underAName: 0, underANameAndOverALitRow: 0, overAThing: 0, overAWord: 0 });

const noWordBy = { picks: new Map<string, number>(), traces: new Map<string, number>() };
let withAConditionAndNoRing = 0;
const examples: string[] = [];
const note = (line: string): void => {
  if (lists || examples.length < 12) examples.push(line);
};

const count = (totals: Totals, label: string, stageName: string, scene: Scene, lead: NodeId | null, viewport: Stage["viewport"], isReading: boolean, isFirstConfiguration: boolean): void => {
  const lit = litOf(scene);
  const boxes = wordBoxesOf(scene);
  const visible = visibleRectOf(scene, viewport, isReading);
  const outside = boxes.filter((word) => !isInside(word.rect, visible));
  totals.outsideTheView += outside.length;
  if (outside.length > 0) totals.scenesWithAWordOutsideTheView += 1;
  for (const word of outside) note(`${label}: "${word.text}" is outside the view`);
  if (!isFirstConfiguration) return;

  totals.scenes += 1;
  totals.lit += lit.length;
  totals.boxes += boxes.length;
  for (const cable of lit) {
    const [from, to] = cable.key.split(">");
    const isTheRelationBack = lead !== null && to === lead && lit.some((other) => other.key === relationKey({ from: lead, to: from as NodeId }));
    const isBeside = scene.beside.some((word) => word.keys.includes(cable.key));
    if (cable.words !== null) totals.onTheWire += 1;
    else if (isBeside) totals.besideOrUnder += 1;
    else if (isTheRelationBack) totals.relationBack += 1;
    else {
      totals.noWord += 1;
      const by = lead === null ? noWordBy.traces : noWordBy.picks;
      by.set(stageName, (by.get(stageName) ?? 0) + 1);
      if (cable.conditional && cable.gate === null) withAConditionAndNoRing += 1;
    }
  }
  const things = thingsOf(scene);
  let strangers = 0;
  for (const [index, word] of boxes.entries()) {
    const under = strangersUnder(word, scene);
    if (under.length > 0) {
      strangers += 1;
      note(`${label}: "${word.text}" of ${word.keys.join(" ")} (${word.place}) is on the line ${under[0]?.key} (${under[0]?.tone})`);
    }
    for (const thing of things) {
      if (!overlap(word.rect, thing.rect)) continue;
      totals.overAThing += 1;
      note(`${label}: "${word.text}" of ${word.keys.join(" ")} is over ${thing.name}`);
    }
    for (const other of boxes.slice(index + 1)) if (overlap(word.rect, other.rect)) totals.overAWord += 1;
  }
  totals.onALineOfADifferentRelation += strangers;
  if (strangers > 0) totals.scenesWithSuchAWord += 1;
  for (const under of wordsUnderNames(scene)) {
    totals.underAName += 1;
    if (under.litBelow.length === 0) continue;
    totals.underANameAndOverALitRow += 1;
    note(`${label}: "${under.word.text}" under ${under.word.node} is over the lit row ${under.litBelow.join(", ")}`);
  }
};

const configurations = SIZES.flatMap((size) => [true, false].map((isReading) => ({ ...size, isReading })));
const bySize = new Map(configurations.map((configuration) => [`${configuration.name}, reader ${configuration.isReading ? "open" : "closed"}`, zero()]));

for (const [index, configuration] of configurations.entries()) {
  const stage: Stage = { graph, placement, viewport: configuration.viewport };
  const totals = bySize.get(`${configuration.name}, reader ${configuration.isReading ? "open" : "closed"}`) ?? zero();
  const withReader = (state: ViewState): ViewState => (configuration.isReading ? state : step(state, { kind: "readerClosed" }, stage));
  for (const target of stages) {
    const locked = run(stage, [...selects(target), { kind: "lockToggled" }]);
    const present = deriveScene({ ...stage, state: locked }).nodes.filter((node) => !node.offStage).map((node) => node.id);
    for (const node of present) {
      const state = withReader(step(locked, { kind: "picked", id: node }, stage));
      count(totals, `${nameOf(target)}, ${node} picked`, nameOf(target), deriveScene({ ...stage, state }), node, configuration.viewport, state.reading.kind === "open", index === 0);
    }
    for (const route of graph.index.routes) {
      const state = withReader(step(locked, { kind: "traced", route: route.id }, stage));
      count(totals, `${nameOf(target)}, route ${route.id} traced`, nameOf(target), deriveScene({ ...stage, state }), null, configuration.viewport, state.reading.kind === "open", index === 0);
    }
  }
}

// The Tools lens unfolds the tool marks of each row of the rest map into chips, and a chip is drawn over each line.
const withTools = { scenes: 0, chips: 0, covered: 0 };
{
  const stage: Stage = { graph, placement, viewport: SIZES[0].viewport };
  const locked = run(stage, [{ kind: "lensed", lens: "tools" }, { kind: "lockToggled" }]);
  const scenes = [
    ...graph.index.nodes.map((node) => deriveScene({ ...stage, state: step(locked, { kind: "picked", id: node.id }, stage) })),
    ...graph.index.routes.map((route) => deriveScene({ ...stage, state: step(locked, { kind: "traced", route: route.id }, stage) })),
  ];
  for (const scene of scenes) {
    withTools.scenes += 1;
    withTools.chips += scene.nodes.reduce((sum, node) => sum + node.chips.length, 0);
    const covered = coveredByChips(scene);
    withTools.covered += covered.length;
    for (const line of covered) note(line);
  }
}

const first = [...bySize.values()][0] ?? zero();
const lines = [
  `scenes: ${first.scenes} (each locked stage with each pick of a node on it and each trace)`,
  `lit lines: ${first.lit}`,
  `  word on the line: ${first.onTheWire}`,
  `  word beside or under the name: ${first.besideOrUnder}`,
  `  relation back of a pair, no word of its own: ${first.relationBack}`,
  `  no word: ${first.noWord}`,
  `word boxes: ${first.boxes}`,
  `words on a line of a different relation: ${first.onALineOfADifferentRelation} in ${first.scenesWithSuchAWord} scenes`,
  `words under a name: ${first.underAName}; of these over a lit row, which is as near to the word as its own name: ${first.underANameAndOverALitRow}`,
  `words over a thing of the stage: ${first.overAThing}; words over a word: ${first.overAWord}`,
  ...[...bySize].map(([name, totals]) => `word boxes outside the view at ${name}: ${totals.outsideTheView} in ${totals.scenesWithAWordOutsideTheView} scenes`),
  `with the Tools lens on the locked rest map, ${withTools.scenes} scenes, ${withTools.chips} chips: lit lines, arrowheads, rings, and words under a chip: ${withTools.covered}`,
  `no word and no ring, for a relation with a condition: ${withAConditionAndNoRing}`,
  `no word, by stage, picks: ${[...noWordBy.picks].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => `${name} ${n}`).join("; ")}`,
  `no word, by stage, traces: ${[...noWordBy.traces].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => `${name} ${n}`).join("; ")}`,
  ...examples,
];
process.stdout.write(`${lines.join("\n")}\n`);

if (process.argv.includes("--pin")) {
  const entries = (by: ReadonlyMap<string, number>): string => [...by].map(([name, n]) => `    ${JSON.stringify(name)}: ${n},`).join("\n");
  const total = (by: ReadonlyMap<string, number>): number => [...by.values()].reduce((sum, n) => sum + n, 0);
  writeFileSync(
    nodePath.join(import.meta.dirname, "words-left-off.ts"),
    `/**
 * The lit relations of the snapshot that show no word on a locked stage, because no place that the rules permit has room for the word.
 * For each locked stage: how many, over each pick of a node on it, and over each trace on it. \`lock.test.ts\` compares these with the snapshot.
 * On the live skills that test states the rule only. \`npx tsx test/recount-words.ts --pin\` writes this file. Run it after a refresh of the snapshot, and read the difference.
 */
export const WORDS_LEFT_OFF: { readonly picks: { readonly [stage: string]: number }; readonly traces: { readonly [stage: string]: number }; readonly withAConditionAndNoRing: number } = {
  // ${total(noWordBy.picks)} in all.
  picks: {
${entries(noWordBy.picks)}
  },
  // ${total(noWordBy.traces)} in all.
  traces: {
${entries(noWordBy.traces)}
  },
  withAConditionAndNoRing: ${withAConditionAndNoRing},
};
`,
  );
}
