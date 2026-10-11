import type { Point } from "../layout";
import type { CableTone, CableView } from "./scene";

/**
 * Every lit cable into one port of one node shares the last run of its path. The port gets one mark for all of them:
 * an arrow when a cable ends there, and a bar when a `boundary` cable ends there.
 */
export interface PortMark {
  readonly key: string;
  readonly at: Point;
  /** 1 when the cables arrive from the left, -1 from the right. */
  readonly arrives: 1 | -1;
  readonly hasArrow: boolean;
  readonly hasBar: boolean;
  /** The tone that colors the mark: a cable of the focus before a cable of a preview. */
  readonly tone: CableTone;
  readonly bright: boolean;
  readonly cables: readonly CableView[];
}

export const cableSide = (tone: CableTone): "needs" | "neededBy" => (tone === "in" || tone === "previewIn" ? "neededBy" : "needs");

const isPreview = (tone: CableTone): boolean => tone === "previewOut" || tone === "previewIn";

export const portMarksOf = (cables: readonly CableView[]): PortMark[] => {
  const byPort = new Map<string, CableView[]>();
  for (const cable of cables) {
    if (cable.tone === "weave" || cable.tone === "frame") continue;
    const key = `${cableSide(cable.tone)} ${cable.end.x},${cable.end.y} ${cable.arrives}`;
    const group = byPort.get(key);
    if (group === undefined) byPort.set(key, [cable]);
    else group.push(cable);
  }
  return [...byPort].flatMap(([key, group]): PortMark[] => {
    const first = group[0];
    if (first === undefined) return [];
    return [
      {
        key,
        at: first.end,
        arrives: first.arrives,
        hasArrow: group.some((cable) => cable.cls !== "avoid"),
        hasBar: group.some((cable) => cable.cls === "avoid"),
        tone: (group.find((cable) => !isPreview(cable.tone)) ?? first).tone,
        bright: group.some((cable) => cable.bright),
        cables: group,
      },
    ];
  });
};
