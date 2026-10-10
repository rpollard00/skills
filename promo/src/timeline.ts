import type { MusicId, SfxId } from "./audio/ids";
import { effectSfx, type Effect, type TimedEffect } from "./battle";
import { resolveCopy } from "./catalog";
import type { CoverFrom } from "./kit/motion";
import type { SceneContracts, SceneKind } from "./scenes/contracts";
import type { CoverColor, ThemeName } from "./theme";

export interface Tempo {
  readonly fps: number;
  /** A multiple of 4, so that a quarter-beat is a whole number of frames. */
  readonly framesPerBeat: number;
  readonly beatsPerBar: number;
}

/** A file in this repository, relative to the repository root. */
export type SourceFile = "README.md" | `skills/${string}.md`;

/** Where the text of a card comes from. A product claim needs a file and a quote that occurs in it. */
export type Source =
  | { readonly kind: "quote"; readonly file: SourceFile; readonly text: string }
  | { readonly kind: "flavor" }
  | { readonly kind: "example" };

export const quote = (file: SourceFile, text: string): Source => ({ kind: "quote", file, text });
/** Game flavor that states no product fact. */
export const flavor: Source = { kind: "flavor" };
/** Text of the invented example task. */
export const example: Source = { kind: "example" };

/** One sentence in the message window. Tokens such as `{skills}` resolve from the catalog. */
export interface CardSpec {
  readonly lines: readonly [string] | readonly [string, string];
  readonly source: Source;
}

/** A named time in a shot. All numbers are beats in quarter-beat steps. */
export interface CueSpec {
  /** Beats after the shot starts. */
  readonly at: number;
  /** Length of the event. Default 0: an instant. */
  readonly span?: number;
  /** Plays at each hit. */
  readonly sfx?: SfxId;
  /** Plays `span` beats after each hit. */
  readonly endSfx?: SfxId;
  /** `count` hits in total, `every` beats apart. */
  readonly repeat?: { readonly count: number; readonly every: number };
}

export type ShotSpec<Cue extends string, Label extends string> = {
  /** The only length in the film data. Starts are running sums. */
  readonly beats: number;
  /** The music section changes at this shot. Without it, the section continues. */
  readonly music?: MusicId;
  /** A voiceover file below public/. The music lowers while it plays. */
  readonly vo?: string;
  readonly card: CardSpec | null;
  /** Text of 3 words or fewer. Tokens such as `{skills}` resolve from the catalog. */
  readonly labels: { readonly [L in Label]: string };
  readonly cues: { readonly [C in Cue]: CueSpec };
};

export type ExitSpec =
  | { readonly kind: "cut" }
  /** A Bayer cover over the last `beats` of the scene. Its last frame is flat `color`. */
  | { readonly kind: "cover"; readonly color: CoverColor; readonly from: CoverFrom; readonly beats: number };

export const cut: ExitSpec = { kind: "cut" };

export type ShotId<K extends SceneKind> = keyof SceneContracts[K]["shots"] & string;

type CueName<K extends SceneKind, S extends ShotId<K>> = SceneContracts[K]["shots"][S] extends {
  readonly cues: infer Name extends string;
}
  ? Name
  : never;

type LabelName<K extends SceneKind, S extends ShotId<K>> = SceneContracts[K]["shots"][S] extends {
  readonly labels: infer Name extends string;
}
  ? Name
  : never;

export type CuePath<K extends SceneKind> = { [S in ShotId<K>]: `${S}.${CueName<K, S>}` }[ShotId<K>];
export type LabelPath<K extends SceneKind> = { [S in ShotId<K>]: `${S}.${LabelName<K, S>}` }[ShotId<K>];

type TurnPart<K extends SceneKind> = K extends "battle" ? { readonly effects: readonly Effect[] } : unknown;

export type SceneSpecOf<K extends SceneKind> = {
  readonly kind: K;
  readonly theme: ThemeName;
  /** The music section at the first shot. */
  readonly music: MusicId;
  readonly exit: ExitSpec;
  /** In running order. */
  readonly shots: { readonly [S in ShotId<K>]: ShotSpec<CueName<K, S>, LabelName<K, S>> & TurnPart<K> };
  readonly props: SceneContracts[K]["props"];
};

export type SceneSpec = { [K in SceneKind]: SceneSpecOf<K> }[SceneKind];

export interface FilmSpec {
  readonly tempo: Tempo;
  /** The running order. */
  readonly scenes: readonly [SceneSpec, ...SceneSpec[]];
}

export interface Card {
  readonly lines: readonly string[];
  readonly source: Source;
}

/** `beat` is from the scene start. `frame` is from the film start. */
export interface Hit {
  readonly beat: number;
  readonly frame: number;
}

export interface Cue {
  readonly name: string;
  readonly sfx: SfxId | null;
  readonly endSfx: SfxId | null;
  /** Beats. 0 for an instant. */
  readonly span: number;
  readonly spanFrames: number;
  /** Repeats expanded. */
  readonly hits: readonly [Hit, ...Hit[]];
}

export interface Shot {
  readonly id: string;
  /** From the scene start. */
  readonly startBeat: number;
  readonly beats: number;
  /** From the film start. */
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly music: MusicId;
  readonly vo: string | null;
  readonly card: Card | null;
  readonly labels: readonly { readonly name: string; readonly text: string }[];
  readonly cues: readonly Cue[];
  /** Battle turns only. Empty in other scenes. */
  readonly effects: readonly TimedEffect[];
}

export type Exit =
  | { readonly kind: "cut" }
  | { readonly kind: "cover"; readonly color: CoverColor; readonly from: CoverFrom; readonly frames: number };

interface SceneBody {
  /** Position in the running order, from 0. */
  readonly index: number;
  readonly tempo: Tempo;
  readonly theme: ThemeName;
  /** From the film start. */
  readonly startBeat: number;
  readonly beats: number;
  /** From the film start. */
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly exit: Exit;
  readonly shots: readonly [Shot, ...Shot[]];
}

export type SceneOf<K extends SceneKind> = SceneBody & {
  readonly kind: K;
  readonly props: SceneContracts[K]["props"];
};

export type Scene = { [K in SceneKind]: SceneOf<K> }[SceneKind];

export interface Timeline {
  readonly tempo: Tempo;
  readonly scenes: readonly [Scene, ...Scene[]];
  readonly beats: number;
  readonly durationFrames: number;
  /** Hash of all data that the audio script reads. See `audioView`. */
  readonly audioHash: string;
}

/** A broken rule of treatment section 6 that needs no file system to find. */
export interface Problem {
  readonly rule: "1 card" | "3 cue" | "4 length";
  readonly where: string;
  readonly message: string;
}

const LIMITS = {
  cardWords: 12,
  cardLines: 2,
  cardLineChars: 30,
  secondsPerWord: 0.5,
  labelWords: 3,
  minSeconds: 75,
  maxSeconds: 100,
  stepsPerBeat: 4,
} as const;

const countWords = (text: string): number =>
  text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

export const cardBudget = (card: Card): { readonly words: number; readonly neededSeconds: number; readonly longestLine: number } => {
  const words = card.lines.reduce((sum, line) => sum + countWords(line), 0);
  return {
    words,
    neededSeconds: words * LIMITS.secondsPerWord,
    longestLine: Math.max(...card.lines.map((line) => line.length)),
  };
};

export interface AudioView {
  readonly fps: number;
  readonly framesPerBeat: number;
  readonly beatsPerBar: number;
  readonly durationFrames: number;
  /** Runs of consecutive shots that share one music id, in film order. */
  readonly sections: readonly { readonly music: MusicId; readonly startFrame: number; readonly beats: number }[];
  /**
   * Every resolved sound hit, repeats expanded. `ordinal` counts from 0 inside one cue; `count` is that cue's total.
   * `spanFrames` is the span of the cue in frames, 0 when the cue has no span. A run-style effect fills it.
   */
  readonly hits: readonly {
    readonly sfx: SfxId;
    readonly frame: number;
    readonly ordinal: number;
    readonly count: number;
    readonly spanFrames: number;
  }[];
  readonly audioHash: string;
}

/** Paths below public/. `scripts/audio.ts` writes them; `Film.tsx` and `Root.tsx` read them. */
export const AUDIO_FILES = {
  music: "audio/music.wav",
  sfx: "audio/sfx.wav",
  manifest: "audio/manifest.json",
} as const;

/** The content of `AUDIO_FILES.manifest`: `{ "audioHash": "<AudioView.audioHash>" }`. */
export interface AudioManifest {
  readonly audioHash: string;
}

export const STALE_AUDIO_MESSAGE = "Audio is stale. Run: npm run audio";

export const parseAudioManifest = (value: unknown): AudioManifest | null => {
  if (typeof value !== "object" || value === null || !("audioHash" in value)) return null;
  return typeof value.audioHash === "string" ? { audioHash: value.audioHash } : null;
};

type AudioData = Omit<AudioView, "audioHash">;

const deriveAudio = (tempo: Tempo, scenes: readonly Scene[], durationFrames: number): AudioData => {
  const sections: { music: MusicId; startFrame: number; beats: number }[] = [];
  const hits: { sfx: SfxId; frame: number; ordinal: number; count: number; spanFrames: number }[] = [];

  for (const shot of scenes.flatMap((scene) => scene.shots)) {
    const last = sections.at(-1);
    if (last !== undefined && last.music === shot.music) last.beats += shot.beats;
    else sections.push({ music: shot.music, startFrame: shot.startFrame, beats: shot.beats });

    for (const cue of shot.cues) {
      const count = cue.hits.length;
      cue.hits.forEach((hit, ordinal) => {
        const spanFrames = cue.spanFrames;
        if (cue.sfx !== null) hits.push({ sfx: cue.sfx, frame: hit.frame, ordinal, count, spanFrames });
        if (cue.endSfx !== null) hits.push({ sfx: cue.endSfx, frame: hit.frame + spanFrames, ordinal, count, spanFrames });
      });
    }

    const trains = new Map<SfxId, TimedEffect[]>();
    for (const timed of shot.effects) {
      const sfx = effectSfx(timed.effect);
      if (sfx !== null) trains.set(sfx, [...(trains.get(sfx) ?? []), timed]);
    }
    for (const [sfx, train] of trains) {
      train.forEach((timed, ordinal) => hits.push({ sfx, frame: timed.frame, ordinal, count: train.length, spanFrames: 0 }));
    }
  }

  return {
    fps: tempo.fps,
    framesPerBeat: tempo.framesPerBeat,
    beatsPerBar: tempo.beatsPerBar,
    durationFrames,
    sections,
    hits: hits.sort((a, b) => a.frame - b.frame),
  };
};

const hashText = (text: string): string => {
  let high = 0xdeadbeef;
  let low = 0x41c6ce57;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    high = Math.imul(high ^ code, 2654435761);
    low = Math.imul(low ^ code, 1597334677);
  }
  high = Math.imul(high ^ (high >>> 16), 2246822507) ^ Math.imul(low ^ (low >>> 13), 3266489909);
  low = Math.imul(low ^ (low >>> 16), 2246822507) ^ Math.imul(high ^ (high >>> 13), 3266489909);
  return [low, high].map((half) => (half >>> 0).toString(16).padStart(8, "0")).join("");
};

export const audioView = (timeline: Timeline): AudioView => ({
  ...deriveAudio(timeline.tempo, timeline.scenes, timeline.durationFrames),
  audioHash: timeline.audioHash,
});

type LooseShotSpec = ShotSpec<string, string> & { readonly effects?: readonly Effect[] };

interface LooseSceneSpec {
  readonly kind: SceneKind;
  readonly theme: ThemeName;
  readonly music: MusicId;
  readonly exit: ExitSpec;
  readonly shots: { readonly [id: string]: LooseShotSpec };
}

const nonEmpty = <T>(items: readonly T[], what: string): readonly [T, ...T[]] => {
  const [first, ...rest] = items;
  if (first === undefined) throw new Error(`${what} is empty.`);
  return [first, ...rest];
};

const tagScene = (spec: SceneSpec, body: SceneBody): Scene => {
  switch (spec.kind) {
    case "title":
      return { ...body, kind: spec.kind, props: spec.props };
    case "goal":
      return { ...body, kind: spec.kind, props: spec.props };
    case "playbooks":
      return { ...body, kind: spec.kind, props: spec.props };
    case "equip":
      return { ...body, kind: spec.kind, props: spec.props };
    case "battle":
      return { ...body, kind: spec.kind, props: spec.props };
    case "report":
      return { ...body, kind: spec.kind, props: spec.props };
    case "end":
      return { ...body, kind: spec.kind, props: spec.props };
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
};

/**
 * The one boundary between film data and everything that reads it. Converts
 * beats to frames with running sums, replaces copy tokens, expands repeats,
 * and lists every broken rule that it can see. It does not throw for a broken
 * rule: `npm run check` prints `problems` and fails.
 */
export const defineFilm = (spec: FilmSpec): { readonly timeline: Timeline; readonly problems: readonly Problem[] } => {
  const { tempo } = spec;
  const problems: Problem[] = [];
  const toFrames = (beats: number): number => Math.round(beats * tempo.framesPerBeat);
  const onStep = (beats: number): boolean => Number.isInteger(beats * LIMITS.stepsPerBeat);
  const seconds = (frames: number): number => frames / tempo.fps;

  if (!Number.isInteger(tempo.framesPerBeat / LIMITS.stepsPerBeat)) {
    problems.push({ rule: "3 cue", where: "tempo", message: `framesPerBeat ${tempo.framesPerBeat} is not a multiple of ${LIMITS.stepsPerBeat}.` });
  }

  const copy = (text: string, where: string): string => {
    const resolved = resolveCopy(text);
    const unknown = /\{[^}]*\}/.exec(resolved);
    if (unknown !== null) problems.push({ rule: "1 card", where, message: `Unknown copy token ${unknown[0]}.` });
    return resolved;
  };

  const resolveCue = (args: {
    readonly name: string;
    readonly cue: CueSpec;
    readonly shotBeats: number;
    readonly shotStartBeat: number;
    readonly sceneStartFrame: number;
    readonly where: string;
  }): Cue => {
    const { name, cue, shotBeats, shotStartBeat, sceneStartFrame, where } = args;
    const span = cue.span ?? 0;
    const count = cue.repeat?.count ?? 1;
    const every = cue.repeat?.every ?? 0;
    const fail = (message: string): void => void problems.push({ rule: "3 cue", where, message });

    if (!Number.isInteger(count) || count < 1) fail(`repeat.count ${count} is not a whole number of 1 or more.`);
    if (![cue.at, span, every].every(onStep)) fail(`at ${cue.at}, span ${span}, every ${every}: each must be a quarter-beat step.`);
    if (span < 0 || every < 0) fail(`span ${span} and every ${every} must not be negative.`);
    const lastAt = cue.at + (Math.max(1, count) - 1) * every;
    if (cue.at < 0 || lastAt >= shotBeats) fail(`hits from beat ${cue.at} to ${lastAt} are not all inside the shot (0 to ${shotBeats}).`);
    else if (lastAt + span > shotBeats) fail(`the last hit ends at beat ${lastAt + span}, after the shot ends at ${shotBeats}.`);

    const hitAt = (ordinal: number): Hit => {
      const beat = shotStartBeat + cue.at + ordinal * every;
      return { beat, frame: sceneStartFrame + toFrames(beat) };
    };
    const repeats = Array.from({ length: Math.max(0, Math.floor(count) - 1) }, (_, index) => hitAt(index + 1));
    return {
      name,
      sfx: cue.sfx ?? null,
      endSfx: cue.endSfx ?? null,
      span,
      spanFrames: toFrames(span),
      hits: [hitAt(0), ...repeats],
    };
  };

  const resolveCard = (card: CardSpec, where: string, durationFrames: number): Card => {
    const source: Source =
      card.source.kind === "quote" ? { ...card.source, text: copy(card.source.text, where) } : card.source;
    const resolved: Card = { lines: card.lines.map((line) => copy(line, where)), source };
    const budget = cardBudget(resolved);
    const fail = (message: string): void => void problems.push({ rule: "1 card", where, message });
    if (budget.words > LIMITS.cardWords) fail(`The card has ${budget.words} words. The limit is ${LIMITS.cardWords}.`);
    if (resolved.lines.length > LIMITS.cardLines) fail(`The card has ${resolved.lines.length} lines. The limit is ${LIMITS.cardLines}.`);
    for (const line of resolved.lines) {
      if (line.length > LIMITS.cardLineChars) fail(`The line "${line}" has ${line.length} characters. The limit is ${LIMITS.cardLineChars}.`);
    }
    if (seconds(durationFrames) < budget.neededSeconds) {
      fail(`The card has ${budget.words} words and needs ${budget.neededSeconds} s. The shot is ${seconds(durationFrames)} s.`);
    }
    return resolved;
  };

  const resolveBody = (scene: LooseSceneSpec, index: number, startBeat: number): SceneBody => {
    const startFrame = toFrames(startBeat);
    let shotStartBeat = 0;
    let music = scene.music;

    const shots = Object.entries(scene.shots).map(([id, shot]): Shot => {
      const where = `${scene.kind}.${id}`;
      const start = shotStartBeat;
      shotStartBeat += shot.beats;
      music = shot.music ?? music;
      const durationFrames = toFrames(shot.beats);
      if (shot.beats <= 0 || !onStep(shot.beats)) {
        problems.push({ rule: "4 length", where, message: `The shot length ${shot.beats} is not a positive quarter-beat step.` });
      }

      const labels = Object.entries(shot.labels).map(([name, text]) => {
        const resolved = copy(text, `${where}.${name}`);
        if (countWords(resolved) > LIMITS.labelWords) {
          problems.push({ rule: "1 card", where: `${where}.${name}`, message: `The label "${resolved}" has ${countWords(resolved)} words. The limit is ${LIMITS.labelWords}.` });
        }
        return { name, text: resolved };
      });

      const effects = (shot.effects ?? []).map((effect, position): TimedEffect => {
        const over = "over" in effect ? effect.over : 0;
        if (![effect.at, over].every(onStep) || effect.at < 0 || effect.at >= shot.beats || over < 0) {
          problems.push({ rule: "3 cue", where: `${where}.effects[${position}] (${effect.kind})`, message: `at ${effect.at}, over ${over}: the effect must start inside the turn (0 to ${shot.beats}) on a quarter-beat step.` });
        }
        const beat = start + effect.at;
        return { effect, beat, frame: startFrame + toFrames(beat) };
      });

      return {
        id,
        startBeat: start,
        beats: shot.beats,
        startFrame: startFrame + toFrames(start),
        durationFrames,
        music,
        vo: shot.vo ?? null,
        card: shot.card === null ? null : resolveCard(shot.card, where, durationFrames),
        labels,
        cues: Object.entries(shot.cues).map(([name, cue]) =>
          resolveCue({ name, cue, shotBeats: shot.beats, shotStartBeat: start, sceneStartFrame: startFrame, where: `${where}.${name}` }),
        ),
        effects,
      };
    });

    const beats = shotStartBeat;
    if (!Number.isInteger(beats / tempo.beatsPerBar)) {
      problems.push({ rule: "4 length", where: scene.kind, message: `The scene is ${beats} beats. That is not a whole number of ${tempo.beatsPerBar}-beat bars.` });
    }
    const exit: Exit =
      scene.exit.kind === "cut"
        ? scene.exit
        : { kind: "cover", color: scene.exit.color, from: scene.exit.from, frames: toFrames(scene.exit.beats) };
    if (scene.exit.kind === "cover" && (!onStep(scene.exit.beats) || scene.exit.beats <= 0 || scene.exit.beats > beats)) {
      problems.push({ rule: "3 cue", where: `${scene.kind}.exit`, message: `The cover length ${scene.exit.beats} must be a quarter-beat step inside the scene.` });
    }

    return {
      index,
      tempo,
      theme: scene.theme,
      startBeat,
      beats,
      startFrame,
      durationFrames: toFrames(beats),
      exit,
      shots: nonEmpty(shots, `Scene "${scene.kind}"`),
    };
  };

  let filmBeat = 0;
  const scenes = nonEmpty(
    spec.scenes.map((sceneSpec, index) => {
      const body = resolveBody(sceneSpec, index, filmBeat);
      filmBeat += body.beats;
      return tagScene(sceneSpec, body);
    }),
    "The film",
  );

  const durationFrames = toFrames(filmBeat);
  if (seconds(durationFrames) < LIMITS.minSeconds || seconds(durationFrames) > LIMITS.maxSeconds) {
    problems.push({ rule: "4 length", where: "film", message: `The film is ${seconds(durationFrames)} s. The limits are ${LIMITS.minSeconds} s to ${LIMITS.maxSeconds} s.` });
  }

  const audioHash = hashText(JSON.stringify(deriveAudio(tempo, scenes, durationFrames)));
  return { timeline: { tempo, scenes, beats: filmBeat, durationFrames, audioHash }, problems };
};

/** The scene of a kind. Throws when the running order has none. */
export const sceneOf = <K extends SceneKind>(timeline: Timeline, kind: K): SceneOf<K> => {
  const scene = timeline.scenes.find((candidate): candidate is Extract<Scene, { readonly kind: K }> => candidate.kind === kind);
  if (scene === undefined) throw new Error(`The film has no "${kind}" scene.`);
  return scene;
};

export interface CueState {
  /** Beats since the first hit. Negative before it. */
  readonly since: number;
  /** 0 to 1 across the span of the first hit, clamped. With no span: 0 before the hit, 1 from it. */
  readonly progress: number;
  /** Length of one hit in beats. */
  readonly span: number;
  /** Beats since each hit, repeats expanded. Negative before a hit. */
  readonly hits: readonly number[];
  /** The number of hits at or before this frame. */
  readonly fired: number;
}

export interface CurrentCard extends Card {
  /** Beats since the card appeared. */
  readonly age: number;
}

export interface SceneClock<K extends SceneKind> {
  /** From the scene start. */
  readonly frame: number;
  /** From the film start. Use it for motion that continues across a cut. */
  readonly filmFrame: number;
  readonly fps: number;
  readonly framesPerBeat: number;
  /** Beats since the scene start. Has a fraction. */
  readonly beat: number;
  readonly shot: ShotId<K>;
  /** The card of the shot on screen, with tokens replaced. */
  readonly card: CurrentCard | null;
  /** Beats since that shot started. Negative before it. */
  sinceShot(id: ShotId<K>): number;
  cue(path: CuePath<K>): CueState;
  /** The text of a label, with tokens replaced. */
  label(path: LabelPath<K>): string;
}

const splitPath = (path: string): readonly [shot: string, name: string] => {
  const dot = path.indexOf(".");
  return [path.slice(0, dot), path.slice(dot + 1)];
};

/** The clock of a scene at a scene-local frame. `useSceneClock` calls it with `useCurrentFrame()`. */
export const sceneClockAt = <K extends SceneKind>(scene: SceneOf<K>, frame: number): SceneClock<K> => {
  const { fps, framesPerBeat } = scene.tempo;
  const beat = frame / framesPerBeat;

  const shotById = (id: string): Shot => {
    const shot = scene.shots.find((candidate) => candidate.id === id);
    if (shot === undefined) throw new Error(`Scene "${scene.kind}" has no shot "${id}".`);
    return shot;
  };
  const current = scene.shots.findLast((shot) => shot.startBeat <= beat) ?? scene.shots[0];

  return {
    frame,
    filmFrame: scene.startFrame + frame,
    fps,
    framesPerBeat,
    beat,
    shot: current.id as ShotId<K>,
    card: current.card === null ? null : { ...current.card, age: beat - current.startBeat },
    sinceShot: (id) => beat - shotById(id).startBeat,
    cue: (path) => {
      const [shotId, name] = splitPath(path);
      const cue = shotById(shotId).cues.find((candidate) => candidate.name === name);
      if (cue === undefined) throw new Error(`Shot "${scene.kind}.${shotId}" has no cue "${name}".`);
      const hits = cue.hits.map((hit) => beat - hit.beat);
      const since = beat - cue.hits[0].beat;
      return {
        since,
        progress: cue.span > 0 ? Math.min(1, Math.max(0, since / cue.span)) : since >= 0 ? 1 : 0,
        span: cue.span,
        hits,
        fired: hits.filter((age) => age >= 0).length,
      };
    },
    label: (path) => {
      const [shotId, name] = splitPath(path);
      const label = shotById(shotId).labels.find((candidate) => candidate.name === name);
      if (label === undefined) throw new Error(`Shot "${scene.kind}.${shotId}" has no label "${name}".`);
      return label.text;
    },
  };
};
