import {
  type Arrangement,
  arrange,
  type Level,
  type SectionAudio,
  type SectionContext,
} from "./arrangement";
import {
  fade,
  gainStereo,
  geometric,
  glide,
  mapStereo,
  scale,
  smooth,
  type Stereo,
  stepped,
  toSamples,
} from "./dsp";
import {
  bassStep,
  type Chord,
  chord,
  DORIAN_TONIC,
  type Mode,
  MOTIF,
  MOTIF_CELL,
  stepHz,
  sus2,
  triad,
} from "./harmony";
import type { MusicId } from "./ids";
import {
  bassNote,
  bellNote,
  crash,
  hat,
  keyNote,
  kick,
  leadNote,
  noiseSweep,
  padNote,
  pluckNote,
  shaker,
  sineTone,
  snare,
  tom,
} from "./instruments";

export type Section = (ctx: SectionContext) => SectionAudio;

const LEVELS: Readonly<Record<MusicId, number>> = {
  well: 0.27,
  pulse: 0.28,
  menu: 0.58,
  battle: 0.66,
  proof: 0.7,
  build: 0.7,
  resolve: 0.84,
  report: 0.54,
  outro: 0.62,
};

const LEAD_RELEASE_SECONDS = 0.09;
const BASS_RELEASE_SECONDS = 0.05;
const PAD_DETUNE_CENTS = 16;
const CROSS_SECONDS = 0.5;

const cycle = <T>(values: readonly [T, ...T[]], index: number): T =>
  values[((index % values.length) + values.length) % values.length] ?? values[0];

function eachMark(pattern: string, visit: (mark: string, position: number) => void): void {
  [...pattern].forEach((mark, position) => {
    if (mark !== "-") visit(mark, position);
  });
}

const isAccent = (position: number): boolean => position === 0 || position === 6 || position === 12;

const progress = (value: number, from: number, to: number): number =>
  to <= from ? 1 : Math.min(1, Math.max(0, (value - from) / (to - from)));

const mix = (from: number, to: number, x: number): number => from + (to - from) * x;

interface Note {
  readonly step: number;
  readonly at: number;
  readonly sixteenths: number;
}

const MOTIF_CELL_NOTES: readonly [Note, Note, Note] = [
  { ...MOTIF_CELL[0], at: 0 },
  { ...MOTIF_CELL[1], at: MOTIF_CELL[0].sixteenths },
  { ...MOTIF_CELL[2], at: MOTIF_CELL[0].sixteenths + MOTIF_CELL[1].sixteenths },
];

function cell(of: Chord, floor: number): readonly Note[] {
  const [low, middle, high] = triad(of, floor);
  return [
    { ...MOTIF_CELL_NOTES[0], step: high },
    { ...MOTIF_CELL_NOTES[1], step: middle },
    { ...MOTIF_CELL_NOTES[2], step: low },
  ];
}

interface LeadLine {
  readonly mode: Mode;
  readonly start: number;
  readonly notes: readonly Note[];
  readonly bright: number;
  readonly level: Level;
}

function addLead(a: Arrangement, line: LeadLine): void {
  for (const note of line.notes) {
    if (line.mode === "dorian" && note.step === MOTIF[3].step) {
      throw new Error("The lead plays the fourth motif note before the gate opens.");
    }
    a.add(
      "lead",
      leadNote({
        hz: stepHz(line.mode, note.step),
        gate: a.gate(line.start + note.at, note.sixteenths, LEAD_RELEASE_SECONDS) * 0.9,
        bright: line.bright,
      }),
      line.start + note.at,
      line.level,
    );
  }
}

interface BassLine {
  readonly mode: Mode;
  readonly step: number;
  readonly at: number;
  readonly sixteenths: number;
  readonly hold: number;
  readonly bright: number;
  readonly accent: boolean;
  readonly gain: number;
}

function addBass(a: Arrangement, note: BassLine): void {
  a.add(
    "bass",
    bassNote({
      hz: stepHz(note.mode, note.step),
      gate: a.gate(note.at, note.sixteenths, BASS_RELEASE_SECONDS) * note.hold,
      bright: note.bright,
      accent: note.accent,
    }),
    note.at,
    { gain: note.gain, send: 0 },
  );
}

const OSTINATO: readonly [number, number, number, number] = [0, 2, 1, 2];
const OSTINATO_FLOOR = 7;

interface OstinatoNote {
  readonly of: Chord;
  readonly at: number;
  readonly index: number;
  readonly bright: number;
  readonly t60: number;
  readonly level: Level;
}

function addOstinato(a: Arrangement, note: OstinatoNote): void {
  const step = triad(note.of, OSTINATO_FLOOR)[cycle(OSTINATO, note.index)] ?? OSTINATO_FLOOR;
  a.add(
    "key",
    keyNote({ hz: stepHz(note.of.mode, step), bright: note.bright, t60: note.t60 }),
    note.at,
    note.level,
  );
}

interface Riser {
  readonly start: number;
  readonly sixteenths: number;
  readonly from: number;
  readonly to: number;
  readonly q: number;
  readonly curve: "linear" | "square";
  readonly seed: number;
  readonly level: Level;
}

function addRiser(a: Arrangement, riser: Riser): void {
  const seconds = a.seconds(riser.sixteenths);
  const noise = noiseSweep({ seconds, from: riser.from, to: riser.to, q: riser.q, seed: riser.seed });
  const lift = glide({ length: noise.left.length, from: 0, to: 1, seconds, curve: "linear" });
  const shape = fade(riser.curve === "square" ? scale(lift, lift) : lift, { out: 0.006 });
  a.add("air", gainStereo(noise, shape), riser.start, riser.level);
}

interface PadChord {
  readonly mode: Mode;
  readonly steps: readonly number[];
  readonly start: number;
  readonly sixteenths: number;
  readonly cutoff: number | Float32Array;
  readonly voices: number;
  readonly gain: number;
  readonly send: number;
  readonly attack: number;
  readonly release: number;
  readonly seed: number;
}

function addPadChord(a: Arrangement, args: PadChord): void {
  args.steps.forEach((step, voice) => {
    a.add(
      "pad",
      padNote({
        hz: stepHz(args.mode, step),
        gate: a.gate(args.start, args.sixteenths, args.release),
        attack: args.attack,
        release: args.release,
        cutoff: args.cutoff,
        voices: args.voices,
        detune: PAD_DETUNE_CENTS,
        seed: args.seed * 31 + voice,
      }),
      args.start,
      { gain: args.gain, send: args.send },
    );
  });
}

interface Stab {
  readonly of: Chord;
  readonly at: number;
  readonly cutoff: number;
  readonly gain: number;
  readonly seed: number;
}

function addStab(a: Arrangement, stab: Stab): void {
  triad(stab.of, -1).forEach((step, voice) => {
    const note = padNote({
      hz: stepHz(stab.of.mode, step),
      gate: 0.07,
      attack: 0.004,
      release: 0.12,
      cutoff: stab.cutoff,
      voices: 5,
      detune: PAD_DETUNE_CENTS,
      seed: stab.seed * 37 + voice,
    });
    a.add("stab", note, stab.at, { gain: stab.gain, send: 0.3, echo: 0.2 });
  });
}

interface DroneArgs {
  readonly attack: number;
  readonly cutoff: Float32Array;
  readonly fifth: number;
}

function addDrone(a: Arrangement, args: DroneArgs): void {
  const gate = a.gate(0, a.sixteenths, CROSS_SECONDS);
  const held = { gate, attack: args.attack, release: CROSS_SECONDS };
  const layers = [
    { step: -14, voices: 5, gain: 0.32, send: 0.3, cutoff: args.cutoff },
    { step: -7, voices: 5, gain: 0.3, send: 0.4, cutoff: args.cutoff },
    { step: -3, voices: 3, gain: args.fifth, send: 0.4, cutoff: args.cutoff },
    { step: 0, voices: 3, gain: 0.12, send: 0.5, cutoff: args.cutoff },
    { step: 7, voices: 3, gain: 0.05, send: 0.7, cutoff: 3600 },
    { step: 11, voices: 3, gain: 0.04, send: 0.7, cutoff: 3600 },
  ];
  layers.forEach((layer, index) => {
    const note = padNote({
      ...held,
      hz: stepHz("dorian", layer.step),
      cutoff: layer.cutoff,
      voices: layer.voices,
      detune: PAD_DETUNE_CENTS,
      seed: 1 + index,
    });
    a.add("pad", note, 0, { gain: layer.gain, send: layer.send });
  });
  a.add("pad", sineTone({ ...held, hz: stepHz("dorian", -14) }), 0, { gain: 0.16, send: 0 });
}

interface Kit {
  readonly hard: Stereo;
  readonly soft: Stereo;
  readonly sub: Stereo;
  readonly closed: readonly [Stereo, Stereo, Stereo];
  readonly open: Stereo;
  readonly shakers: readonly [Stereo, Stereo];
  readonly toms: Readonly<Record<"h" | "m" | "l", Stereo>>;
}

const makeKit = (seed: number, mode: Mode): Kit => ({
  hard: kick("hard"),
  soft: kick("soft"),
  sub: kick("sub"),
  closed: [hat(false, seed), hat(false, seed + 1), hat(false, seed + 2)],
  open: hat(true, seed + 3),
  shakers: [shaker(seed + 4), shaker(seed + 5)],
  toms: {
    h: tom(stepHz(mode, -7), seed + 6),
    m: tom(stepHz(mode, -10), seed + 7),
    l: tom(stepHz(mode, -12), seed + 8),
  },
});

interface KickHit {
  readonly at: number;
  readonly gain: number;
  readonly send: number;
  readonly duck: number;
}

function addKick(a: Arrangement, sound: Stereo, hit: KickHit): void {
  a.add("kick", sound, hit.at, { gain: hit.gain, send: hit.send });
  a.duck(hit.at, hit.duck);
}

interface DrumBar {
  readonly kick: string;
  readonly snare: string;
  readonly tom: string;
  readonly hat: string;
  readonly shaker: boolean;
}

const HAT_GAIN: Readonly<Record<string, number>> = { X: 0.15, x: 0.1, ".": 0.055, o: 0.11 };

interface DrumLevel {
  readonly snare: Level;
  readonly top: number;
  readonly seed: number;
}

function addDrumBar(a: Arrangement, kit: Kit, start: number, bar: DrumBar, level: DrumLevel): void {
  eachMark(bar.kick, (_, position) => {
    addKick(a, kit.hard, { at: start + position, gain: position === 0 ? 0.95 : 0.78, send: 0.02, duck: 0.45 });
  });
  eachMark(bar.snare, (mark, position) => {
    const ghost = mark === "g";
    const roll = { gain: mix(0.3, 0.7, position / 15), send: 0.25 };
    a.add(
      "snare",
      snare(ghost ? "ghost" : "full", level.seed + position),
      start + position,
      ghost ? { gain: 0.22, send: 0.1 } : mark === "r" ? roll : level.snare,
    );
  });
  eachMark(bar.tom, (mark, position) => {
    if (mark === "h" || mark === "m" || mark === "l") {
      a.add("tom", kit.toms[mark], start + position, { gain: 0.6, send: 0.2 });
    }
  });
  eachMark(bar.hat, (mark, position) => {
    a.add("hat", mark === "o" ? kit.open : cycle(kit.closed, position), start + position, {
      gain: (HAT_GAIN[mark] ?? 0) * level.top,
      send: 0.08,
    });
  });
  if (bar.shaker) {
    for (let position = 0; position < a.bar; position++) {
      a.add("shaker", cycle(kit.shakers, position), start + position, {
        gain: (position % 2 === 0 ? 0.07 : 0.11) * level.top,
        send: 0.1,
      });
    }
  }
}

const well: Section = (ctx) => {
  const a = arrange(ctx);
  const held = a.samples + toSamples(CROSS_SECONDS);
  const cutoff = smooth(stepped(held, geometric(260, 1700, 8), a.samples / 8), 5);
  addDrone(a, { attack: 1.4, cutoff, fifth: 0.14 });

  const swell = a.sixteenths / 2;
  const half = a.seconds(swell) / 2;
  [0, swell].forEach((start, index) => {
    const air = noiseSweep({ seconds: a.seconds(swell), from: 3200, to: 6400, q: 0.9, seed: 20 + index });
    const shaped = mapStereo(air, (channel) => fade(channel, { in: half, out: half }));
    a.add("air", shaped, start, { gain: 0.1, send: 0.5 });
  });

  let at = a.sixteenths >= 64 ? 16 : 0;
  MOTIF.forEach((note, index) => {
    const ring = a.ring(at, 4.5);
    if (ring > 0.2) {
      const string = pluckNote({ hz: stepHz("dorian", note.step), seconds: ring, bright: 0.85, seed: 40 + index });
      a.add("pluck", string, at, { gain: 0.5, send: 0.7, echo: 0.3 });
      const bell = bellNote({ hz: stepHz("dorian", note.step + 7), t60: 1.8, ratio: 3, index: 1.2 });
      a.add("bell", bell, at, { gain: 0.07, send: 0.8 });
    }
    at += note.sixteenths * 2;
  });

  return a.render(() => DORIAN_TONIC, LEVELS.well);
};

const pulse: Section = (ctx) => {
  const a = arrange(ctx);
  const kit = makeKit(100, "dorian");
  const cutoff = glide({
    length: a.samples + toSamples(CROSS_SECONDS),
    from: 1700,
    to: 2200,
    seconds: a.seconds(a.sixteenths),
    curve: "exp",
  });
  addDrone(a, { attack: CROSS_SECONDS, cutoff, fifth: 0.18 });

  for (let position = 0; position < a.sixteenths; position += 2) {
    const inBar = position % a.bar;
    const bar = Math.floor(position / a.bar);
    const along = progress(position, 0, a.sixteenths);
    const accent = isAccent(inBar);
    if (inBar % 8 === 0) addKick(a, kit.sub, { at: position, gain: 0.8, send: 0, duck: 0.3 });
    if (bar >= 1) {
      const fifth = accent && bar >= 3;
      const low = keyNote({ hz: stepHz("dorian", fifth ? -3 : -7), bright: mix(0.1, 0.5, along), t60: 0.24 });
      a.add("key", low, position, { gain: accent ? 0.2 : 0.11, send: 0.35, echo: 0.25 });
    }
    if (bar >= 1) {
      const fifth = accent && bar >= 3;
      const high = keyNote({ hz: stepHz("dorian", fifth ? 4 : 0), bright: mix(0.5, 0.9, along), t60: 0.2 });
      a.add("key", high, position, { gain: accent ? 0.16 : 0.09, send: 0.4, echo: 0.3 });
    }
    if (bar >= 3 && accent) {
      const top = keyNote({ hz: stepHz("dorian", 7), bright: mix(0.5, 0.9, along), t60: 0.18 });
      a.add("key", top, position, { gain: 0.07, send: 0.5, echo: 0.3 });
    }
    if (bar >= 1 && inBar % 4 === 2) {
      a.add("hat", cycle(kit.closed, position / 2), position, { gain: mix(0.16, 0.26, along), send: 0.2 });
    }
    if (bar >= 2) {
      a.add("shaker", cycle(kit.shakers, position / 2), position, { gain: mix(0.05, 0.16, along), send: 0.2 });
    }
  }
  for (let bar = 1; bar < Math.floor(a.sixteenths / a.bar); bar += 2) {
    const bell = bellNote({ hz: stepHz("dorian", MOTIF[0].step + 7), t60: 1.6, ratio: 3, index: 1.4 });
    a.add("bell", bell, bar * a.bar, { gain: 0.09, send: 0.8 });
  }

  const rise = Math.min(a.bar, a.sixteenths);
  addRiser(a, {
    start: a.sixteenths - rise,
    sixteenths: rise,
    from: 500,
    to: 5200,
    q: 1.1,
    curve: "square",
    seed: 30,
    level: { gain: 0.2, send: 0.5 },
  });

  return a.render(() => DORIAN_TONIC, LEVELS.pulse);
};

const menu: Section = (ctx) => {
  const a = arrange(ctx);
  const kit = makeKit(200, "dorian");
  const chordAt = (bar: number): Chord =>
    bar >= a.bars - 1 ? chord("dorian", 4) : chord("dorian", cycle([0, 0, 6, 3], bar));
  const leadFrom = Math.max(0, a.bars - 5);
  const ostinatoFrom = Math.min(5, leadFrom);
  const leadLevel = { gain: 0.2, send: 0.4, echo: 0.35 };

  for (let bar = 0; bar < a.bars; bar++) {
    const start = bar * a.bar;
    const of = chordAt(bar);
    const last = bar === a.bars - 1;
    const odd = bar % 2 === 1;
    const along = progress(bar, 0, a.bars - 1);

    eachMark(odd ? "x-----x-------x-" : "x-----x---------", (_, position) => {
      addKick(a, kit.hard, { at: start + position, gain: position === 0 ? 0.8 : 0.62, send: 0.02, duck: 0.4 });
    });
    a.add("snare", snare("snap", 210 + bar), start + 8, { gain: 0.5, send: 0.3 });
    a.add("snare", snare("ghost", 240 + bar), start + 8, { gain: 0.35, send: 0.2 });
    for (let position = 0; position < a.bar; position += 2) {
      const open = odd && position === 14;
      a.add("hat", open ? kit.open : cycle(kit.closed, position / 2), start + position, {
        gain: open ? 0.1 : position % 4 === 0 ? 0.13 : 0.07,
        send: 0.1,
      });
    }
    if (bar >= ostinatoFrom) {
      for (let position = 0; position < a.bar; position++) {
        a.add("shaker", cycle(kit.shakers, position), start + position, {
          gain: position % 2 === 0 ? 0.04 : 0.07,
          send: 0.1,
        });
      }
    }

    if (bar >= 2) {
      const root = bassStep(of);
      const line = odd
        ? [
            { at: 0, sixteenths: 5, step: root },
            { at: 6, sixteenths: 4, step: root },
            { at: 12, sixteenths: 2, step: root + 4 },
            { at: 14, sixteenths: 2, step: root + 6 },
          ]
        : [
            { at: 0, sixteenths: 5, step: root },
            { at: 6, sixteenths: 4, step: root },
            { at: 12, sixteenths: 3, step: root + 7 },
          ];
      for (const note of line) {
        addBass(a, {
          mode: "dorian",
          step: note.step,
          at: start + note.at,
          sixteenths: note.sixteenths,
          hold: 0.85,
          bright: 0.4,
          accent: note.at === 0,
          gain: 0.36,
        });
      }
    }

    addPadChord(a, {
      mode: of.mode,
      steps: triad(of, -8),
      start,
      sixteenths: a.bar,
      cutoff: mix(1000, 1700, along),
      voices: 7,
      gain: 0.13,
      send: 0.4,
      attack: 0.04,
      release: 0.18,
      seed: 300 + bar,
    });

    if (bar >= ostinatoFrom && !last) {
      for (let position = 0; position < a.bar; position += 2) {
        addOstinato(a, {
          of,
          at: start + position,
          index: position / 2,
          bright: 0.4,
          t60: 0.2,
          level: { gain: isAccent(position) ? 0.075 : 0.045, send: 0.45, echo: 0.3 },
        });
      }
    }

    const phrase = bar - leadFrom;
    if (phrase === 0 || phrase === 2) {
      const notes = cell(of, phrase === 0 ? 0 : -1);
      addLead(a, { mode: "dorian", start, notes, bright: 0.5, level: leadLevel });
    }
    if (phrase === 3) {
      const held = [{ step: triad(of, -1)[0], at: 0, sixteenths: 10 }];
      addLead(a, { mode: "dorian", start, notes: held, bright: 0.45, level: leadLevel });
    }

    if (last) {
      [12, 13, 14, 15].forEach((position, index) => {
        a.add("snare", snare(index === 3 ? "full" : "snap", 260 + index), start + position, {
          gain: 0.3 + 0.12 * index,
          send: 0.3,
        });
      });
      addRiser(a, {
        start: start + 8,
        sixteenths: 8,
        from: 700,
        to: 7000,
        q: 1.2,
        curve: "square",
        seed: 31,
        level: { gain: 0.25, send: 0.4 },
      });
    }
  }

  return a.render((sixteenth) => chordAt(Math.floor(sixteenth / a.bar)), LEVELS.menu);
};

const NO_TOMS = "----------------";

type DrumPhase = readonly [DrumBar, ...DrumBar[]];

const BATTLE_PHASES: readonly [DrumPhase, ...DrumPhase[]] = [
  [
    { kick: "x-----x---x-----", snare: "----x-------x---", tom: NO_TOMS, hat: "X-x-X-x-X-x-X-x-", shaker: false },
    { kick: "x-----x---x---x-", snare: "----x-------x---", tom: NO_TOMS, hat: "X-x-X-x-X-x-X-x-", shaker: false },
    { kick: "x-----x---x-----", snare: "----x-------x---", tom: NO_TOMS, hat: "X.x.X.x.X.x.X.x.", shaker: false },
    { kick: "x-----x---x---x-", snare: "----x-------rrrr", tom: NO_TOMS, hat: "X.x.X.x.X.x.----", shaker: false },
  ],
  [
    { kick: "x-----x---x-----", snare: "----x--g----x---", tom: NO_TOMS, hat: "X.x.X.x.X.x.X.x.", shaker: false },
    { kick: "x-----x---x---x-", snare: "----x--g----x---", tom: NO_TOMS, hat: "X.x.X.x.X.x.X.o.", shaker: false },
    { kick: "x-----x---x-----", snare: "----x--g----x---", tom: NO_TOMS, hat: "X.x.X.x.X.x.X.x.", shaker: false },
    { kick: "x-----x---x-----", snare: "----x--g----x---", tom: "-------------hml", hat: "X.x.X.x.X.x.----", shaker: false },
  ],
  [
    { kick: "x--x--x---x--x--", snare: "----x--g-g--x--g", tom: NO_TOMS, hat: "X.o.X.o.X.o.X.o.", shaker: true },
    { kick: "x--x--x---x-x-x-", snare: "----x--g-g--x---", tom: NO_TOMS, hat: "X.o.X.o.X.o.X.o.", shaker: true },
    { kick: "x--x--x---x--x--", snare: "----x--g-g--x--g", tom: NO_TOMS, hat: "X.o.X.o.X.o.X.o.", shaker: true },
    { kick: "x--x--x-x---x---", snare: "----x--gx-xx----", tom: "------------hhml", hat: "X.o.X.o.--------", shaker: true },
  ],
  [
    { kick: "x--x--x-x--x--x-", snare: "----x--g----x-g-", tom: NO_TOMS, hat: "X.o.X.o.X.o.X.o.", shaker: true },
    { kick: "x--x--x-x-x-x-x-", snare: "----x--gr-r-rrrr", tom: NO_TOMS, hat: "X.o.X.o.X.x.----", shaker: true },
  ],
];

const battleDrums = (bar: number): DrumBar =>
  cycle(BATTLE_PHASES[Math.min(BATTLE_PHASES.length - 1, Math.floor(bar / 4))] ?? BATTLE_PHASES[0], bar);

const battle: Section = (ctx) => {
  const a = arrange(ctx, "cut");
  const kit = makeKit(400, "dorian");
  const claim = Math.max(0, a.sixteenths - 24);
  const pickup = Math.max(claim, a.sixteenths - 8);
  const grooveBars = Math.ceil(claim / a.bar);
  const subdominant = chord("dorian", 3);
  const chordAt = (sixteenth: number): Chord => {
    if (sixteenth >= claim + 8) return subdominant;
    if (sixteenth >= claim) return chord("dorian", 2);
    return chord("dorian", cycle([0, 3, 6, 0], Math.floor(sixteenth / a.bar)));
  };

  const lead = (start: number, notes: readonly Note[], bright: number): void =>
    addLead(a, { mode: "dorian", start, notes, bright, level: { gain: 0.26, send: 0.35, echo: 0.3 } });

  const doubleTime = (of: Chord, floor: number): readonly Note[] => {
    const [low, middle, high] = triad(of, floor);
    return [high, middle, low, high, middle, low].map((step, index) => ({
      step,
      at: cycle([0, 3, 6, 8, 11, 14], index),
      sixteenths: cycle([3, 3, 2], index),
    }));
  };

  const bassBar = (start: number, bar: number, bright: number): void => {
    const root = bassStep(chordAt(start));
    const next = bassStep(chordAt(start + a.bar));
    const approach = next === root ? root + 6 : next > root ? next - 1 : next + 1;
    const phase = Math.floor(bar / 4);
    const note = (position: number, step: number, sixteenths: number, accent: boolean): void =>
      addBass(a, {
        mode: "dorian",
        step,
        at: start + position,
        sixteenths,
        hold: 1,
        bright: bright + (accent ? 0.2 : 0),
        accent,
        gain: 0.4,
      });
    if (phase >= 3) {
      for (let position = 0; position < a.bar; position++) {
        const accent = [0, 3, 6, 8, 11, 14].includes(position);
        note(position, root + (accent && position > 0 ? 7 : 0), accent ? 1 : 0.8, accent);
      }
      return;
    }
    for (let position = 0; position < a.bar; position += 2) {
      const accent = isAccent(position);
      const lift = position === 6 ? 7 : position === 12 ? 4 : 0;
      const walks = phase >= 1 && position === 14;
      note(position, walks ? approach : root + lift, accent ? 1.8 : 1.5, accent);
    }
    if (phase === 2) {
      note(3, root + 7, 0.8, false);
      note(13, root + 4, 0.8, false);
    }
  };

  for (let bar = 0; bar < grooveBars; bar++) {
    const start = bar * a.bar;
    const of = chordAt(start);
    const along = progress(bar, 0, grooveBars - 1);
    const phase = Math.floor(bar / 4);

    addDrumBar(a, kit, start, battleDrums(bar), {
      snare: { gain: 0.62, send: 0.22 },
      top: mix(0.85, 1.15, along),
      seed: 410 + bar * 16,
    });
    if (bar % 4 === 0) {
      a.add("cymbal", crash(430 + bar), start, { gain: bar === 0 ? 0.24 : 0.15, send: 0.3 });
    }
    bassBar(start, bar, mix(0.45, 0.7, along));
    addPadChord(a, {
      mode: of.mode,
      steps: triad(of, -8),
      start,
      sixteenths: a.bar,
      cutoff: mix(1300, 2600, along),
      voices: 7,
      gain: 0.14,
      send: 0.35,
      attack: 0.02,
      release: 0.12,
      seed: 500 + bar,
    });

    if (bar >= 2) {
      for (let position = 0; position < a.bar; position++) {
        addOstinato(a, {
          of,
          at: start + position,
          index: position,
          bright: mix(0.35, 0.7, along),
          t60: 0.16,
          level: { gain: isAccent(position) ? 0.085 : 0.05, send: 0.3, echo: 0.25 },
        });
      }
    }
    if (phase >= 2) {
      for (const position of phase >= 3 ? [3, 9, 13] : [3, 9]) {
        const cutoff = mix(2400, 3600, along);
        addStab(a, { of, at: start + position, cutoff, gain: 0.1, seed: 560 + bar * 16 + position });
      }
    }

    const phrase = bar - 4;
    const bright = mix(0.6, 0.9, along);
    if (phrase === 0) lead(start, cell(of, 0), bright);
    if (phrase === 1) lead(start, [{ step: triad(of, 3)[0], at: 0, sixteenths: 10 }], bright);
    if (phrase === 2) lead(start, cell(of, -1), bright);
    if (phrase === 3) lead(start, [{ step: triad(of, 0)[0], at: 0, sixteenths: 12 }], bright);
    if (phrase >= 4 && phrase <= 7) lead(start, cell(of, cycle([0, 0, 1, 2], phrase)), bright);
    if (phrase >= 8) lead(start, doubleTime(of, 0), bright);
  }

  if (claim < pickup) {
    addDrumBar(
      a,
      kit,
      claim,
      { kick: "x--x--x-x--x--x-", snare: "----x--g----x---", tom: NO_TOMS, hat: "X.o.X.o.X.o.X.o.", shaker: true },
      { snare: { gain: 0.66, send: 0.22 }, top: 1.2, seed: 650 },
    );
    a.add("cymbal", crash(460), claim, { gain: 0.2, send: 0.3 });
    [-12, -12, -12, -12, -11, -11, -11, -11].forEach((step, index) => {
      addBass(a, {
        mode: "dorian",
        step,
        at: claim + index * 2,
        sixteenths: 1.6,
        hold: 1,
        bright: 0.85,
        accent: index % 4 === 0 || index % 4 === 3,
        gain: 0.4,
      });
    });
    [0, 8].forEach((offset) => {
      addPadChord(a, {
        mode: "dorian",
        steps: triad(chordAt(claim + offset), -8),
        start: claim + offset,
        sixteenths: 8,
        cutoff: offset === 0 ? 2800 : 3400,
        voices: 7,
        gain: 0.15,
        send: 0.35,
        attack: 0.02,
        release: 0.1,
        seed: 520 + offset,
      });
      const of = chordAt(claim + offset);
      addStab(a, { of, at: claim + offset + 3, cutoff: 3800, gain: 0.11, seed: 700 + offset });
    });
    for (let position = 0; position < 16; position++) {
      addOstinato(a, {
        of: chordAt(claim + position),
        at: claim + position,
        index: position,
        bright: 0.85,
        t60: 0.16,
        level: { gain: isAccent(position) ? 0.09 : 0.055, send: 0.3, echo: 0.25 },
      });
    }
    lead(claim, MOTIF_CELL_NOTES, 0.95);
  }

  const tail = a.sixteenths - pickup;
  if (tail > 0) {
    for (let position = 0; position < tail; position++) {
      const at = pickup + position;
      const along = progress(position, 0, tail - 1);
      if (position % 4 === 0) addKick(a, kit.hard, { at, gain: 0.9, send: 0.02, duck: 0.45 });
      if (position >= tail / 2 || position % 2 === 0) {
        a.add("snare", snare("full", 470 + position), at, { gain: mix(0.32, 0.72, along), send: 0.25 });
      }
      if (position % 2 === 0) {
        const pedal = { mode: "dorian", step: -10, at, sixteenths: 2, hold: 0.8 } as const;
        addBass(a, { ...pedal, bright: 0.95, accent: true, gain: 0.4 });
      }
      addOstinato(a, {
        of: subdominant,
        at,
        index: position,
        bright: mix(0.8, 1, along),
        t60: 0.16,
        level: { gain: mix(0.07, 0.12, along), send: 0.3 },
      });
    }
    addPadChord(a, {
      mode: "dorian",
      steps: sus2(subdominant, -8),
      start: pickup,
      sixteenths: tail,
      cutoff: glide({
        length: toSamples(a.seconds(tail)),
        from: 2600,
        to: 5000,
        seconds: a.seconds(tail),
        curve: "exp",
      }),
      voices: 7,
      gain: 0.17,
      send: 0.35,
      attack: 0.02,
      release: 0.03,
      seed: 540,
    });
    addRiser(a, {
      start: pickup,
      sixteenths: tail,
      from: 900,
      to: 8000,
      q: 1.2,
      curve: "linear",
      seed: 32,
      level: { gain: 0.25, send: 0.3 },
    });
  }

  return a.render(chordAt, LEVELS.battle);
};

const proof: Section = (ctx) => {
  const a = arrange(ctx);
  const kit = makeKit(600, "dorian");
  const start = Math.min(4, a.sixteenths);
  const body = a.sixteenths - start;
  const dominant = chord("dorian", 4);
  const lastBar = a.sixteenths - Math.min(8, body);

  for (let offset = 0; offset < body; offset++) {
    const at = start + offset;
    const inBar = offset % a.bar;
    const accent = isAccent(inBar);
    const closing = progress(at, lastBar, a.sixteenths);
    if (offset % 2 === 0) {
      addBass(a, {
        mode: "dorian",
        step: -17,
        at,
        sixteenths: 2,
        hold: 0.7,
        bright: 0.3 + 0.3 * closing,
        accent,
        gain: accent ? 0.34 : 0.25,
      });
      const tick = keyNote({ hz: stepHz("dorian", -3), bright: 0.2 + 0.3 * closing, t60: 0.14 });
      a.add("key", tick, at, { gain: accent ? 0.16 : 0.09, send: 0.3, echo: 0.2 });
    }
    const open = inBar === 14 && Math.floor(offset / a.bar) % 2 === 1;
    a.add("hat", open ? kit.open : cycle(kit.closed, offset), at, {
      gain: (open ? 0.09 : inBar % 4 === 0 ? 0.14 : inBar % 2 === 0 ? 0.085 : 0.045) * (1 + closing),
      send: 0.15,
    });
  }

  const hold = { attack: 0.3, release: 0.3, voices: 5, detune: PAD_DETUNE_CENTS };
  const low = glide({
    length: toSamples(a.seconds(body) + hold.release),
    from: 500,
    to: 1200,
    seconds: a.seconds(body),
    curve: "exp",
  });
  [-10, -6].forEach((step, index) => {
    const tone = padNote({
      ...hold,
      hz: stepHz("dorian", step),
      gate: a.gate(start, body, hold.release),
      cutoff: low,
      seed: 610 + index,
    });
    a.add("pad", tone, start, { gain: 0.13, send: 0.4 });
  });
  const rubLength = Math.min(32, body);
  const rubStart = a.sixteenths - rubLength;
  const high = glide({
    length: toSamples(a.seconds(rubLength) + hold.release),
    from: 600,
    to: 2200,
    seconds: a.seconds(rubLength),
    curve: "exp",
  });
  [1, 2].forEach((step, index) => {
    const tone = padNote({
      ...hold,
      attack: a.seconds(rubLength) * 0.7,
      hz: stepHz("dorian", step),
      gate: a.gate(rubStart, rubLength, hold.release),
      cutoff: high,
      seed: 620 + index,
    });
    a.add("pad", tone, rubStart, { gain: 0.07, send: 0.5 });
  });

  const question = [MOTIF_CELL_NOTES[0], MOTIF_CELL_NOTES[1]];
  for (let at = start + 16; at + 12 <= a.sixteenths; at += 32) {
    addLead(a, {
      mode: "dorian",
      start: at,
      notes: question,
      bright: 0.4,
      level: { gain: 0.13, send: 0.6, echo: 0.5 },
    });
  }

  const rise = Math.min(8, body);
  addRiser(a, {
    start: a.sixteenths - rise,
    sixteenths: rise,
    from: 1200,
    to: 7000,
    q: 1.2,
    curve: "square",
    seed: 33,
    level: { gain: 0.15, send: 0.4 },
  });

  return a.render(() => dominant, LEVELS.proof);
};

const build: Section = (ctx) => {
  const a = arrange(ctx);
  const kit = makeKit(700, "dorian");
  const total = a.sixteenths;
  const turn = Math.max(0, total - a.bar);
  const chordAt = (sixteenth: number): Chord => chord("dorian", sixteenth >= turn ? 3 : 4);

  const rolls = new Set([1, 2, 3, 4, 6, 8, 12].map((fromEnd) => total - fromEnd));
  for (let fromEnd = 20; fromEnd <= total; fromEnd += 8) rolls.add(total - fromEnd);

  for (let position = 0; position < total; position++) {
    const along = progress(position, 0, total - 1);
    const of = chordAt(position);
    if (position % 4 === 0) addKick(a, kit.hard, { at: position, gain: 0.92, send: 0.02, duck: 0.45 });
    if (rolls.has(position)) {
      a.add("snare", snare("full", 710 + position), position, { gain: mix(0.34, 0.74, along), send: 0.25 });
    }
    if (position >= turn || position % 2 === 0) {
      a.add("hat", cycle(kit.closed, position), position, {
        gain: (position % 4 === 0 ? 0.13 : position % 2 === 0 ? 0.09 : 0.05) * (1 + 0.5 * along),
        send: 0.08,
      });
    }
    a.add("shaker", cycle(kit.shakers, position), position, { gain: mix(0.03, 0.12, along), send: 0.1 });
    if (position % 2 === 0) {
      addBass(a, {
        mode: "dorian",
        step: bassStep(of),
        at: position,
        sixteenths: 2,
        hold: 0.75,
        bright: mix(0.4, 1, along),
        accent: isAccent(position % a.bar),
        gain: 0.48,
      });
    }
    addOstinato(a, {
      of,
      at: position,
      index: position,
      bright: mix(0.35, 1, along),
      t60: 0.16,
      level: { gain: mix(0.045, 0.11, along), send: 0.3, echo: 0.2 },
    });
  }

  const release = 0.25;
  const opening = glide({
    length: a.samples + toSamples(release),
    from: 800,
    to: 5500,
    seconds: a.seconds(total),
    curve: "exp",
  });
  const spans = [
    { start: 0, sixteenths: turn, steps: triad(chordAt(0), -8) },
    { start: turn, sixteenths: total - turn, steps: sus2(chordAt(turn), -8) },
  ];
  spans.forEach((span, index) => {
    if (span.sixteenths <= 0) return;
    addPadChord(a, {
      mode: "dorian",
      steps: span.steps,
      start: span.start,
      sixteenths: span.sixteenths,
      cutoff: opening.subarray(a.sampleAt(span.start)),
      voices: 7,
      gain: 0.13,
      send: 0.4,
      attack: 0.05,
      release,
      seed: 720 + index,
    });
  });

  addRiser(a, {
    start: 0,
    sixteenths: total,
    from: 300,
    to: 9000,
    q: 1,
    curve: "square",
    seed: 34,
    level: { gain: 0.32, send: 0.4 },
  });

  return a.render(chordAt, LEVELS.build);
};

const resolve: Section = (ctx) => {
  const a = arrange(ctx);
  const kit = makeKit(800, "major");
  const chordAt = (bar: number): Chord => chord("major", cycle([0, 0, 3, 0], bar));

  for (let bar = 0; bar < a.bars; bar++) {
    const start = bar * a.bar;
    const of = chordAt(bar);
    const fill = bar === a.bars - 1;

    addDrumBar(
      a,
      kit,
      start,
      {
        kick: "x-----x---x-----",
        snare: fill ? "----x-------x-xx" : "----x--g----x---",
        tom: fill ? "--------hh-m-l--" : NO_TOMS,
        hat: "X.o.X.o.X.o.X.o.",
        shaker: true,
      },
      { snare: { gain: 0.58, send: 0.25 }, top: 1, seed: 810 + bar * 16 },
    );
    if (bar % 2 === 0) {
      a.add("cymbal", crash(830 + bar), start, { gain: bar === 0 ? 0.26 : 0.15, send: 0.35 });
    }

    for (let position = 0; position < a.bar; position += 2) {
      const accent = isAccent(position);
      addBass(a, {
        mode: "major",
        step: bassStep(of) + (position === 6 ? 7 : position === 12 ? 4 : 0),
        at: start + position,
        sixteenths: 2,
        hold: 0.8,
        bright: accent ? 1 : 0.8,
        accent,
        gain: 0.64,
      });
    }

    const pad = { mode: of.mode, start, sixteenths: a.bar, release: 0.15 };
    addPadChord(a, {
      ...pad,
      steps: triad(of, -8),
      cutoff: 1250,
      voices: 7,
      gain: 0.15,
      send: 0.4,
      attack: 0.02,
      seed: 840 + bar,
    });
    addPadChord(a, {
      ...pad,
      steps: triad(of, -1),
      cutoff: 2400,
      voices: 5,
      gain: 0.02,
      send: 0.5,
      attack: 0.03,
      seed: 860 + bar,
    });

    for (let position = 0; position < a.bar; position++) {
      addOstinato(a, {
        of,
        at: start + position,
        index: position,
        bright: 0.6,
        t60: 0.18,
        level: { gain: isAccent(position) ? 0.04 : 0.024, send: 0.35, echo: 0.25 },
      });
    }

    const notes: readonly Note[] = bar % 2 === 0 ? MOTIF_CELL_NOTES : [{ ...MOTIF[3], at: 0 }];
    const octave = notes.map((note) => ({ ...note, step: note.step + 7 }));
    addLead(a, { mode: "major", start, notes, bright: 0.65, level: { gain: 0.15, send: 0.4, echo: 0.3 } });
    addLead(a, { mode: "major", start, notes: octave, bright: 0.5, level: { gain: 0.04, send: 0.5 } });
    if (bar % 2 === 1) {
      const bell = bellNote({ hz: stepHz("major", MOTIF[3].step + 7), t60: 1.5, ratio: 3, index: 2.2 });
      a.add("bell", bell, start, { gain: 0.05, send: 0.7 });
    }
  }

  return a.render((sixteenth) => chordAt(Math.floor(sixteenth / a.bar)), LEVELS.resolve);
};

const report: Section = (ctx) => {
  const a = arrange(ctx);
  const kit = makeKit(900, "major");
  const chordAt = (bar: number): Chord =>
    chord("major", bar >= a.bars - 1 ? 3 : cycle([0, 3, 5, 3], bar));
  const melody = { gain: 0.42, send: 0.6, echo: 0.2 };

  for (let bar = 0; bar < a.bars; bar++) {
    const start = bar * a.bar;
    const of = chordAt(bar);

    eachMark("x---------x-----", (_, position) => {
      addKick(a, kit.soft, { at: start + position, gain: position === 0 ? 0.7 : 0.5, send: 0.03, duck: 0.3 });
    });
    a.add("snare", snare("snap", 910 + bar), start + 8, { gain: 0.42, send: 0.4 });
    for (let position = 0; position < a.bar; position += 2) {
      a.add("hat", cycle(kit.closed, position / 2), start + position, {
        gain: position % 4 === 0 ? 0.1 : 0.055,
        send: 0.15,
      });
      a.add("shaker", cycle(kit.shakers, position / 2), start + position + 1, { gain: 0.08, send: 0.15 });
    }

    [
      { at: 0, sixteenths: 9 },
      { at: 10, sixteenths: 5 },
    ].forEach((note) => {
      addBass(a, {
        mode: "major",
        step: bassStep(of),
        at: start + note.at,
        sixteenths: note.sixteenths,
        hold: 1,
        bright: 0.25,
        accent: note.at === 0,
        gain: 0.34,
      });
    });

    addPadChord(a, {
      mode: of.mode,
      steps: triad(of, -8),
      start,
      sixteenths: a.bar,
      cutoff: 1600,
      voices: 7,
      gain: 0.15,
      send: 0.5,
      attack: 0.08,
      release: 0.3,
      seed: 920 + bar,
    });

    const [low, , high] = triad(of, -8);
    [
      { at: 0, step: low },
      { at: 6, step: high },
    ].forEach((note, index) => {
      const string = pluckNote({
        hz: stepHz("major", note.step),
        seconds: 1.4,
        bright: 0.7,
        seed: 930 + bar * 2 + index,
      });
      a.add("pluck", string, start + note.at, { gain: 0.2, send: 0.4 });
    });

    if (bar % 2 === 0) {
      const notes = of.root === 0 ? MOTIF_CELL_NOTES : cell(of, -2);
      notes.forEach((note, index) => {
        const string = pluckNote({
          hz: stepHz("major", note.step),
          seconds: 1.8,
          bright: 0.9,
          seed: 950 + bar * 3 + index,
        });
        a.add("pluck", string, start + note.at, melody);
      });
    } else {
      const top = Math.floor(bar / 2) % 2 === 0 ? MOTIF[3].step : 7;
      const string = pluckNote({
        hz: stepHz("major", top),
        seconds: a.ring(start, 3.5),
        bright: 0.9,
        seed: 970 + bar,
      });
      a.add("pluck", string, start, melody);
      const bell = bellNote({ hz: stepHz("major", top + 7), t60: 1.6, ratio: 3, index: 1.4 });
      a.add("bell", bell, start, { gain: 0.06, send: 0.8 });
    }
  }

  return a.render((sixteenth) => chordAt(Math.floor(sixteenth / a.bar)), LEVELS.report);
};

const outro: Section = (ctx) => {
  const a = arrange(ctx);
  const chordAt = (bar: number): Chord => chord("major", a.bars >= 4 && bar === 2 ? 3 : 0);
  const swell = (sixteenth: number): number => {
    const x = sixteenth / a.sixteenths;
    return x < 0.45 ? 0.5 + (0.5 * x) / 0.45 : Math.max(0, 1 - (x - 0.45) / 0.42);
  };
  const release = 0.35;
  const cutoff = new Float32Array(a.samples + toSamples(release));
  for (let i = 0; i < cutoff.length; i++) {
    cutoff[i] = 500 + 1300 * swell((i / a.samples) * a.sixteenths) ** 2;
  }

  for (let bar = 0; bar < a.bars; bar++) {
    const start = bar * a.bar;
    const level = swell(start + a.bar / 2);
    if (level <= 0.03) continue;
    const of = chordAt(bar);
    addPadChord(a, {
      mode: of.mode,
      steps: triad(of, -8),
      start,
      sixteenths: a.bar,
      cutoff: cutoff.subarray(a.sampleAt(start)),
      voices: 7,
      gain: 0.17 * level,
      send: 0.6,
      attack: bar === 0 ? 0.08 : 0.25,
      release,
      seed: 1000 + bar,
    });
    addBass(a, {
      mode: "major",
      step: bassStep(of),
      at: start,
      sixteenths: a.bar,
      hold: 1,
      bright: 0.2,
      accent: false,
      gain: 0.3 * level,
    });
  }

  let at = Math.min(a.bar, Math.max(0, a.sixteenths - 48));
  MOTIF.forEach((note, index) => {
    const last = index === MOTIF.length - 1;
    const ring = a.ring(at, last ? 4.5 : 2.2);
    if (ring > 0.2) {
      const bright = last ? 0.55 : 0.8;
      const string = pluckNote({ hz: stepHz("major", note.step), seconds: ring, bright, seed: 1040 + index });
      a.add("pluck", string, at, { gain: 0.46, send: 0.75, echo: 0.2 });
      const bell = bellNote({ hz: stepHz("major", note.step + 7), t60: last ? 2 : 1.2, ratio: 3, index: 1.3 });
      a.add("bell", bell, at, { gain: last ? 0.035 : 0.04, send: 0.8 });
    }
    at += note.sixteenths;
  });
  if (at + 8 < a.sixteenths) {
    const low = pluckNote({ hz: stepHz("major", -7), seconds: a.ring(at, 3), bright: 0.15, seed: 1050 });
    a.add("pluck", low, at, { gain: 0.27, send: 0.7 });
  }

  return a.render((sixteenth) => chordAt(Math.floor(sixteenth / a.bar)), LEVELS.outro);
};

export const SECTIONS: Readonly<Record<MusicId, Section>> = {
  well,
  pulse,
  menu,
  battle,
  proof,
  build,
  resolve,
  report,
  outro,
};
