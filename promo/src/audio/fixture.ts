import type { AudioView } from "../timeline";
import { hash32 } from "./dsp";
import type { MusicId, SfxId } from "./ids";

const FPS = 30;
const FRAMES_PER_BEAT = 12;
const BEATS_PER_BAR = 4;

const SECTION_BEATS: readonly (readonly [MusicId, number])[] = [
  ["well", 16],
  ["pulse", 20],
  ["menu", 52],
  ["battle", 62],
  ["proof", 22],
  ["build", 12],
  ["resolve", 16],
  ["report", 24],
  ["outro", 20],
];

interface FixtureCue {
  readonly sfx: SfxId;
  readonly beat: number;
  readonly span: number;
  readonly repeat?: { readonly count: number; readonly every: number };
}

const one = (sfx: SfxId, beat: number, span = 0): FixtureCue => ({ sfx, beat, span });
const many = (sfx: SfxId, beat: number, count: number, every: number, span = 0): FixtureCue => ({
  sfx,
  beat,
  span,
  repeat: { count, every },
});

const CUES: readonly FixtureCue[] = [
  one("boot", 0, 4),
  one("stamp", 4),
  one("confirm", 13),
  many("type", 17, 18, 0.25),
  one("window", 25),
  one("deny", 27),
  one("confirm", 28),
  many("cursor", 37, 19, 0.25),
  one("confirm", 44),
  one("tally", 56, 1.5),
  one("orbPick", 69),
  one("slot", 70.5),
  one("orbPick", 71),
  one("slot", 72.5),
  one("orbPick", 73),
  one("slot", 74.5),
  one("trigger", 79),
  one("encounter", 86, 2),
  one("window", 88),
  one("cursor", 96),
  one("spawn", 97),
  one("scan", 99, 4),
  one("confirm", 105),
  one("cursor", 106),
  one("scan", 107, 3),
  one("confirm", 113),
  one("cursor", 114),
  many("record", 116, 3, 2),
  one("confirm", 121),
  one("cursor", 122),
  one("spawn", 123),
  one("trigger", 124),
  one("slot", 126),
  many("hit", 128, 3, 2),
  one("confirm", 133),
  one("cursor", 134),
  one("spawn", 135),
  one("trigger", 136),
  one("slot", 137.5),
  one("scan", 138, 2),
  one("finding", 140),
  one("hit", 141),
  one("fixed", 142),
  one("confirm", 143),
  one("gateSlam", 150),
  many("reject", 152, 3, 2, 1),
  one("slot", 158.5),
  one("cursor", 160),
  many("type", 161, 2, 1),
  many("prove", 164, 2, 2),
  one("fail", 168),
  one("slot", 174.5),
  one("hit", 176),
  one("scan", 179, 2),
  one("prove", 181),
  one("gateOpen", 184, 3),
  one("stamp", 185),
  one("confirm", 188),
  one("cursor", 189),
  one("rise", 196, 4),
  one("wipe", 198, 2),
  many("tally", 202, 4, 2),
  one("stamp", 216),
  many("slot", 218, 7, 0.5),
  many("cursor", 225, 4, 1),
  one("stamp", 232),
  one("type", 235, 3.5),
];

export function fixtureAudioView(): AudioView {
  let startFrame = 0;
  const sections = SECTION_BEATS.map(([music, beats]) => {
    const section = { music, startFrame, beats };
    startFrame += beats * FRAMES_PER_BEAT;
    return section;
  });
  const hits = CUES.flatMap((cue) => {
    const count = cue.repeat?.count ?? 1;
    const every = cue.repeat?.every ?? 0;
    return Array.from({ length: count }, (_, ordinal) => ({
      sfx: cue.sfx,
      frame: Math.round((cue.beat + ordinal * every) * FRAMES_PER_BEAT),
      ordinal,
      count,
      spanFrames: Math.round(cue.span * FRAMES_PER_BEAT),
    }));
  }).sort((a, b) => a.frame - b.frame);
  return {
    fps: FPS,
    framesPerBeat: FRAMES_PER_BEAT,
    beatsPerBar: BEATS_PER_BAR,
    durationFrames: startFrame,
    sections,
    hits,
    audioHash: `fixture-${hash32(JSON.stringify({ sections, hits })).toString(16)}`,
  };
}
