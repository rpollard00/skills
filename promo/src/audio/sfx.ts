import {
  adsr,
  balance,
  type Clip,
  crush,
  dbToGain,
  decay,
  fade,
  fm,
  gainStereo,
  geometric,
  glide,
  mapStereo,
  mixdown,
  mulberry32,
  onePoleLowpass,
  osc,
  pan,
  type Param,
  peak,
  pluck,
  reverb,
  type ReverbArgs,
  saturate,
  scale,
  settle,
  type Shape,
  smooth,
  type Stereo,
  stepped,
  sum,
  svf,
  toSamples,
  toStereo,
  whiteNoise,
} from "./dsp";
import {
  type Chord,
  chordHzNear,
  MAJOR_THIRD,
  MINOR_SECOND,
  PERFECT_FIFTH,
  rootStepNear,
  scaleStepNear,
  stepHz,
  stepWithIntervals,
  triad,
} from "./harmony";
import type { SfxId } from "./ids";
import { padNote } from "./instruments";

export interface VoiceContext {
  readonly ordinal: number;
  readonly count: number;
  readonly chord: Chord;
  readonly seed: number;
  readonly sixteenth: number;
  readonly span: number;
}

export type Voice = (ctx: VoiceContext) => Stereo;

const MAX_SECONDS = 4;
const END_FADE_SECONDS = 0.005;

const PEAK_DB: Readonly<Record<SfxId, number>> = {
  boot: -8,
  stamp: -3,
  cursor: -10,
  confirm: -8,
  deny: -15,
  type: -4,
  window: -10,
  orbPick: -10,
  slot: -8,
  trigger: -10,
  encounter: -5,
  spawn: -8,
  scan: -11,
  record: -3,
  hit: -4,
  finding: -11,
  fixed: -10,
  gateSlam: -3,
  reject: -11,
  prove: -6,
  fail: -13,
  gateOpen: -3,
  rise: -5,
  wipe: -7,
  tally: -8,
};

interface Layer {
  readonly at: number;
  readonly signal: Stereo | Float32Array;
  readonly gain?: number;
}

const asStereo = (signal: Stereo | Float32Array): Stereo =>
  signal instanceof Float32Array ? toStereo(signal) : signal;

function layer(parts: readonly Layer[]): Stereo {
  const clips: Clip[] = parts.map((part) => ({
    at: toSamples(part.at),
    signal: asStereo(part.signal),
    gain: part.gain ?? 1,
  }));
  return mixdown(Math.max(0, ...clips.map((clip) => clip.at + clip.signal.left.length)), clips);
}

function finish(id: SfxId, signal: Stereo, trim = 0): Stereo {
  const length = Math.min(signal.left.length, toSamples(MAX_SECONDS));
  const cut = mapStereo(signal, (channel) => fade(channel.subarray(0, length), { out: END_FADE_SECONDS }));
  const top = peak(cut);
  return top > 0 ? gainStereo(cut, dbToGain(PEAK_DB[id] + trim) / top) : cut;
}

function dense(signal: Stereo, drive: number): Stereo {
  const top = peak(signal);
  return top > 0 ? mapStereo(signal, (channel) => saturate(scale(channel, 1 / top), drive)) : signal;
}

function room(dry: Stereo, wet: number, args: Omit<ReverbArgs, "predelay">): Stereo {
  return layer([
    { at: 0, signal: dry },
    { at: 0, signal: reverb(dry, { ...args, predelay: 0.008 }), gain: wet },
  ]);
}

function tick(seed: number, seconds: number, cutoff: number): Float32Array {
  const length = toSamples(seconds);
  return scale(svf(whiteNoise(length, seed), { mode: "highpass", cutoff }), decay(length, seconds));
}

function blip(shape: Shape, freq: Param, seconds: number, width = 0.5): Float32Array {
  const length = toSamples(seconds);
  const tone = osc({ shape, length, freq, width, phase: shape === "saw" ? 0.5 : 0 });
  return fade(scale(tone, decay(length, seconds * 1.6)), { in: 0.0015, out: Math.min(0.004, seconds / 3) });
}

function beep(shape: Shape, freq: Param, seconds: number, width = 0.5): Float32Array {
  const tone = osc({ shape, length: toSamples(seconds), freq, width });
  return fade(tone, { in: 0.002, out: Math.min(0.012, seconds / 3) });
}

function thud(from: number, to: number, t60: number): Float32Array {
  const length = toSamples(t60 * 1.2);
  const freq = settle({ length, from, to, tau: Math.min(0.035, t60 / 4) });
  return scale(osc({ shape: "sine", length, freq }), decay(length, t60));
}

function noiseBand(seed: number, seconds: number, cutoff: Param, q: number): Stereo {
  const length = toSamples(seconds);
  const band = (offset: number): Float32Array =>
    svf(whiteNoise(length, seed + offset), { mode: "bandpass", cutoff, q });
  const a = band(0);
  const b = band(7919);
  return { left: sum(scale(a, 0.8), scale(b, 0.35)), right: sum(scale(b, 0.8), scale(a, 0.35)) };
}

const MAX_GRID_STEPS = 32;

const gridSteps = (ctx: VoiceContext, own: number): number =>
  ctx.span > 0 ? Math.min(MAX_GRID_STEPS, Math.max(1, Math.round(ctx.span / ctx.sixteenth))) : own;

const sweepHz = (length: number, from: number, to: number, seconds: number): Float32Array =>
  glide({ length, from, to, seconds, curve: "exp" });

const noiseBurst = (seed: number, length: number, cutoff: Param, t60: number): Float32Array =>
  scale(onePoleLowpass(whiteNoise(length, seed), cutoff), decay(length, t60));

const ramp = (length: number, power: number): Float32Array => {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = (i / Math.max(1, length - 1)) ** power;
  return out;
};

const bell = (hz: number, t60: number, index: number): Float32Array => {
  const length = toSamples(t60);
  return fade(
    scale(
      fm({ length, carrier: hz, ratio: 3.5, index: scale(decay(length, t60 * 0.4), index) }),
      decay(length, t60),
    ),
    { in: 0.001, out: 0.02 },
  );
};

const boot: Voice = (ctx) => {
  const seconds = ctx.span > 0 ? Math.min(2.4, Math.max(0.8, ctx.span * 0.8)) : 1.3;
  const length = toSamples(seconds);
  const envelope = adsr({ attack: 0.04, decay: 0.3, sustain: 0.8, release: 0.5, gate: seconds - 0.5 });
  const sweep = sum(
    scale(osc({ shape: "sine", length, freq: sweepHz(length, 40, 80, seconds * 0.7) }), 1),
    scale(osc({ shape: "triangle", length, freq: sweepHz(length, 80, 160, seconds * 0.7), phase: 0.25 }), 0.5),
    scale(osc({ shape: "saw", length, freq: sweepHz(length, 160, 320, seconds * 0.7), phase: 0.5 }), 0.18),
  );
  const air = onePoleLowpass(whiteNoise(length, ctx.seed), sweepHz(length, 300, 4000, seconds));
  const swell = fade(air, { in: seconds * 0.6, out: seconds * 0.35 });
  const dry = layer([
    { at: 0, signal: saturate(scale(sweep, envelope), 1.8) },
    { at: 0, signal: swell, gain: 0.7 },
    { at: 0, signal: tick(ctx.seed + 1, 0.004, 1800), gain: 0.6 },
  ]);
  return finish("boot", room(dry, 0.3, { t60: 1.2, damping: 5000, size: 0.8, tail: 0.9 }));
};

const stamp: Voice = (ctx) => {
  const [low, middle, high] = triad(ctx.chord, 7);
  const tones = [low, middle, high].map((step, index) => ({
    at: 0,
    signal: pan(blip("pulse", stepHz(ctx.chord.mode, step), 0.22, 0.25), (index - 1) * 0.5),
    gain: 0.36,
  }));
  const slap = gainStereo(noiseBand(ctx.seed, 0.09, 2400, 0.7), decay(toSamples(0.09), 0.08));
  const dry = layer([
    { at: 0, signal: saturate(thud(125, 58, 0.14), 1.8), gain: 0.6 },
    { at: 0, signal: slap, gain: 3.2 },
    { at: 0, signal: tick(ctx.seed + 1, 0.006, 3000), gain: 0.5 },
    ...tones,
  ]);
  return finish("stamp", room(dense(dry, 1.5), 0.25, { t60: 0.45, damping: 6000, size: 0.35, tail: 0.4 }));
};

const CURSOR_WAVE = [0, -1, -2, -1] as const;

const cursor: Voice = (ctx) => {
  const hz = chordHzNear(ctx.chord, 1760, CURSOR_WAVE[ctx.ordinal % CURSOR_WAVE.length] ?? 0);
  const tone = onePoleLowpass(blip("pulse", hz, 0.045), 7000);
  const side = ctx.count > 1 ? ((ctx.ordinal % 2) * 2 - 1) * 0.25 : 0;
  return finish("cursor", pan(tone, side));
};

const confirm: Voice = (ctx) => {
  const root = rootStepNear(ctx.chord, 880);
  const first = stepHz(ctx.chord.mode, root);
  const second = stepHz(ctx.chord.mode, root + 4);
  const dry = layer([
    { at: 0, signal: beep("pulse", first, 0.06) },
    { at: 0.06, signal: beep("pulse", second, 0.07) },
    { at: 0.06, signal: blip("sine", second * 2, 0.22), gain: 0.3 },
  ]);
  return finish("confirm", room(dry, 0.2, { t60: 0.5, damping: 6000, size: 0.4, tail: 0.4 }));
};

const deny: Voice = (ctx) => {
  const lower = stepWithIntervals(ctx.chord.mode, 320, [MINOR_SECOND]);
  const dull = (hz: number): Float32Array =>
    svf(beep("pulse", hz, 0.08), { mode: "lowpass", cutoff: 900, q: 1 });
  return finish(
    "deny",
    layer([
      { at: 0, signal: dull(stepHz(ctx.chord.mode, lower + 1)) },
      { at: 0.085, signal: dull(stepHz(ctx.chord.mode, lower)) },
    ]),
  );
};

function keyClick(seed: number): Stereo {
  const next = mulberry32(seed);
  const length = toSamples(0.04);
  const burst = scale(whiteNoise(length, seed + 1), decay(length, 0.012));
  const snap = svf(burst, { mode: "bandpass", cutoff: 2200 + 1000 * next(), q: 2.2 });
  const cap = scale(osc({ shape: "sine", length, freq: 1100 + 300 * next() }), decay(length, 0.02));
  const thump = scale(osc({ shape: "sine", length, freq: 150 }), decay(length, 0.012));
  const voice = crush(sum(scale(snap, 3), scale(cap, 0.35), scale(thump, 0.5)), { bits: 8, hold: 1 });
  return gainStereo(pan(voice, (next() - 0.5) * 0.5), 1 - 0.16 * next());
}

const type: Voice = (ctx) => {
  const clicks = gridSteps(ctx, 1);
  const keys = Array.from({ length: clicks }, (_, index) => ({
    at: index * ctx.sixteenth,
    signal: keyClick(ctx.seed + index * 7),
  }));
  return finish("type", layer(keys), clicks === 1 ? -1.5 * mulberry32(ctx.seed + 3)() : 0);
};

const windowOpen: Voice = (ctx) => {
  const seconds = 0.09;
  const length = toSamples(seconds);
  const sweep = noiseBand(ctx.seed, seconds, sweepHz(length, 500, 4000, seconds), 2.5);
  const shaped = mapStereo(sweep, (channel) => fade(channel, { in: 0.004, out: 0.03 }));
  return finish(
    "window",
    layer([
      { at: 0, signal: shaped, gain: 2 },
      { at: 0, signal: thud(95, 55, 0.09), gain: 0.8 },
      { at: 0, signal: tick(ctx.seed + 3, 0.003, 2500), gain: 0.4 },
    ]),
  );
};

const GLASS_PARTIALS = [
  { ratio: 1, gain: 0.3, t60: 0.35 },
  { ratio: 2.76, gain: 0.2, t60: 0.22 },
  { ratio: 5.4, gain: 0.1, t60: 0.12 },
] as const;

const orbPick: Voice = (ctx) => {
  const hz = chordHzNear(ctx.chord, 1175, ctx.ordinal);
  const string = pluck({ freq: hz, length: toSamples(0.7), seed: ctx.seed, brightness: 0.85, t60: 0.6 });
  const glass = GLASS_PARTIALS.map((partial) => ({
    at: 0,
    signal: blip("sine", hz * partial.ratio, partial.t60),
    gain: partial.gain,
  }));
  const dry = layer([{ at: 0, signal: fade(string, { out: 0.05 }) }, ...glass]);
  return finish("orbPick", room(dry, 0.3, { t60: 0.9, damping: 7000, size: 0.6, tail: 0.6 }));
};

const SHORT_RUN = 3;
const LONG_RUN_END_STEP = 14;

const slot: Voice = (ctx) => {
  const hz =
    ctx.count <= SHORT_RUN
      ? chordHzNear(ctx.chord, stepHz(ctx.chord.mode, 7), ctx.ordinal)
      : stepHz(ctx.chord.mode, LONG_RUN_END_STEP - (ctx.count - 1 - ctx.ordinal));
  const dry = layer([
    { at: 0, signal: thud(150, 70, 0.07), gain: 0.7 },
    { at: 0, signal: tick(ctx.seed, 0.003, 3000), gain: 0.3 },
    { at: 0.004, signal: pan(bell(hz, 1.1, 3), -0.2), gain: 0.6 },
    { at: 0.004, signal: pan(bell(hz * 1.002, 1.1, 2.4), 0.2), gain: 0.6 },
  ]);
  return finish("slot", room(dry, 0.35, { t60: 1.3, damping: 6000, size: 0.8, tail: 0.9 }));
};

const trigger: Voice = (ctx) => {
  const notes = [0, 1, 2].map((offset, index) => ({
    at: index * 0.03,
    signal: beep("pulse", chordHzNear(ctx.chord, 1319, offset), 0.03, 0.25),
  }));
  const zipSeconds = 0.05;
  const zip = noiseBand(ctx.seed, zipSeconds, sweepHz(toSamples(zipSeconds), 3000, 9000, zipSeconds), 1.5);
  const zipped = mapStereo(zip, (channel) => fade(channel, { in: 0.005, out: 0.03 }));
  return finish("trigger", layer([...notes, { at: 0.085, signal: zipped, gain: 1.4 }]));
};

const OWN_STEPS = 8;

function steppedAccent(length: number, steps: number, from: number): Float32Array {
  const stepSamples = length / steps;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const step = Math.min(steps - 1, Math.floor(i / stepSamples));
    const inside = (i - step * stepSamples) / stepSamples;
    out[i] = (from + (1 - from) * (step / Math.max(1, steps - 1))) * (1 - 0.6 * inside);
  }
  return out;
}

const encounter: Voice = (ctx) => {
  const steps = gridSteps(ctx, OWN_STEPS);
  const sweepSeconds = steps * ctx.sixteenth;
  const length = toSamples(sweepSeconds);
  const center = smooth(stepped(length, geometric(200, 6000, steps), length / steps), 300);
  const sweep = gainStereo(noiseBand(ctx.seed, sweepSeconds, center, 6), steppedAccent(length, steps, 0.25));
  const swell = gainStereo(noiseBand(ctx.seed + 5, sweepSeconds, 5000, 0.6), ramp(length, 2.5));
  const burstLength = toSamples(0.5);
  const closing = settle({ length: burstLength, from: 9000, to: 500, tau: 0.08 });
  const burst = noiseBurst(ctx.seed + 9, burstLength, closing, 0.4);
  const dry = layer([
    { at: 0, signal: tick(ctx.seed + 2, 0.004, 1500), gain: 0.5 },
    { at: 0, signal: mapStereo(sweep, (channel) => fade(channel, { out: 0.01 })), gain: 3.5 },
    { at: 0, signal: mapStereo(swell, (channel) => fade(channel, { out: 0.01 })), gain: 1 },
    { at: sweepSeconds, signal: saturate(thud(120, 42, 1.1), 1.8), gain: 1.3 },
    { at: sweepSeconds, signal: burst, gain: 0.5 },
  ]);
  return finish("encounter", room(dry, 0.3, { t60: 1.6, damping: 5000, size: 1, tail: 0.6 }));
};

const spawn: Voice = (ctx) => {
  const seconds = 0.25;
  const length = toSamples(seconds);
  const target = chordHzNear(ctx.chord, 880);
  const rise = osc({ shape: "saw", length, freq: sweepHz(length, target / 4, target, seconds), phase: 0.5 });
  const opened = svf(rise, { mode: "lowpass", cutoff: sweepHz(length, 300, 4500, seconds), q: 1.4 });
  const sweep = fade(scale(opened, ramp(length, 0.7)), { in: 0.002, out: 0.02 });
  const string = pluck({ freq: target, length: toSamples(0.35), seed: ctx.seed, brightness: 0.8, t60: 0.4 });
  const dry = layer([
    { at: 0, signal: tick(ctx.seed + 1, 0.003, 3000), gain: 0.3 },
    { at: 0, signal: sweep, gain: 0.7 },
    { at: seconds, signal: fade(string, { out: 0.04 }) },
  ]);
  return finish("spawn", room(dry, 0.25, { t60: 0.7, damping: 6000, size: 0.5, tail: 0.5 }));
};

const scan: Voice = (ctx) => {
  const next = mulberry32(ctx.seed);
  const base = scaleStepNear(ctx.chord.mode, 1568);
  const stepSeconds = ctx.sixteenth;
  const steps = gridSteps(ctx, OWN_STEPS);
  const tones = Array.from({ length: steps }, (_, index) => {
    const hz = stepHz(ctx.chord.mode, base + Math.floor(next() * 8) - 3);
    const length = toSamples(stepSeconds);
    const carrier = osc({ shape: "sine", length, freq: hz });
    const ring = osc({ shape: "sine", length, freq: 90, phase: 0.25 });
    const modulated = carrier.map((value, i) => value * (0.55 + 0.45 * (ring[i] ?? 0)));
    return {
      at: index * stepSeconds,
      signal: pan(fade(modulated, { in: 0.002, out: 0.01 }), (index / Math.max(1, steps - 1)) * 1.2 - 0.6),
    };
  });
  return finish("scan", layer(tones));
};

const record: Voice = (ctx) => {
  const latchLength = toSamples(0.1);
  const latch = gainStereo(noiseBand(ctx.seed + 1, 0.1, 2200, 0.8), decay(latchLength, 0.09));
  const dry = layer([
    { at: 0, signal: saturate(thud(180, 90, 0.13), 1.5), gain: 0.5 },
    { at: 0, signal: latch, gain: 3 },
    { at: 0, signal: blip("sine", 1650, 0.04), gain: 0.5 },
    { at: 0, signal: tick(ctx.seed, 0.005, 3000), gain: 1 },
  ]);
  return finish("record", dense(dry, 2));
};

const HIT_VARIANTS = [
  { from: 600, band: 1800 },
  { from: 520, band: 2500 },
  { from: 700, band: 1400 },
] as const;

const hit: Voice = (ctx) => {
  const pick = ctx.count > 1 ? ctx.ordinal : ctx.seed;
  const variant = HIT_VARIANTS[pick % HIT_VARIANTS.length] ?? HIT_VARIANTS[0];
  const seconds = 0.18;
  const length = toSamples(seconds);
  const drop = scale(
    osc({ shape: "pulse", length, freq: sweepHz(length, variant.from, 100, 0.1) }),
    decay(length, 0.11),
  );
  const burst = gainStereo(noiseBand(ctx.seed, seconds, variant.band, 0.6), decay(length, 0.16));
  const dry = layer([
    { at: 0, signal: saturate(svf(drop, { mode: "lowpass", cutoff: 3500 }), 2), gain: 0.5 },
    { at: 0, signal: burst, gain: 5 },
    { at: 0, signal: tick(ctx.seed + 3, 0.008, 2000), gain: 1 },
    { at: 0, signal: thud(140, 60, 0.1), gain: 0.35 },
  ]);
  return finish("hit", room(dense(dry, 2), 0.3, { t60: 0.4, damping: 6000, size: 0.3, tail: 0.3 }));
};

const alarmStep = (ctx: VoiceContext): number =>
  stepWithIntervals(ctx.chord.mode, 660, [MINOR_SECOND, PERFECT_FIFTH]);

const finding: Voice = (ctx) => {
  const lower = alarmStep(ctx);
  const pair = sum(
    beep("pulse", stepHz(ctx.chord.mode, lower), 0.15, 0.3),
    beep("pulse", stepHz(ctx.chord.mode, lower + 1), 0.15, 0.3),
  );
  return finish("finding", toStereo(svf(pair, { mode: "lowpass", cutoff: 3500 })));
};

const fixed: Voice = (ctx) => {
  const lower = alarmStep(ctx);
  const low = stepHz(ctx.chord.mode, lower);
  const high = stepHz(ctx.chord.mode, lower + 4);
  const pair = sum(beep("pulse", low, 0.15, 0.3), beep("pulse", high, 0.15, 0.3));
  const dry = layer([
    { at: 0, signal: svf(pair, { mode: "lowpass", cutoff: 3500 }) },
    { at: 0, signal: blip("sine", high * 2, 0.3), gain: 0.35 },
  ]);
  return finish("fixed", room(dry, 0.2, { t60: 0.5, damping: 6000, size: 0.4, tail: 0.4 }));
};

const CLANG_PARTIALS = [
  { ratio: 1, t60: 1.3 },
  { ratio: 1.47, t60: 1.2 },
  { ratio: 2.09, t60: 1.1 },
  { ratio: 2.56, t60: 0.9 },
  { ratio: 3.39, t60: 0.8 },
  { ratio: 4.16, t60: 0.7 },
  { ratio: 5.43, t60: 0.6 },
  { ratio: 6.79, t60: 0.5 },
  { ratio: 8.21, t60: 0.45 },
  { ratio: 11.3, t60: 0.4 },
] as const;

const gateSlam: Voice = (ctx) => {
  const subLength = toSamples(1);
  const sub = scale(
    osc({ shape: "sine", length: subLength, freq: sweepHz(subLength, 90, 30, 0.6) }),
    decay(subLength, 0.9),
  );
  const knock = thud(320, 110, 0.18);
  const clang = CLANG_PARTIALS.map((partial, index) => ({
    at: 0,
    signal: pan(blip("sine", 196 * partial.ratio, partial.t60), ((index % 3) - 1) * 0.5),
    gain: 0.3 / (1 + index * 0.12),
  }));
  const burstLength = toSamples(0.5);
  const closing = settle({ length: burstLength, from: 9000, to: 900, tau: 0.09 });
  const burst = noiseBurst(ctx.seed, burstLength, closing, 0.4);
  const dry = layer([
    { at: 0, signal: saturate(sum(sub, scale(knock, 0.7)), 2.2), gain: 1 },
    { at: 0, signal: burst, gain: 1.2 },
    { at: 0, signal: tick(ctx.seed + 1, 0.006, 1500), gain: 0.8 },
    ...clang,
  ]);
  return finish("gateSlam", room(dry, 0.4, { t60: 2.4, damping: 5000, size: 1.2, tail: 1.8 }));
};

const reject: Voice = (ctx) => {
  const lower = stepWithIntervals(ctx.chord.mode, 116, [MINOR_SECOND]);
  const seconds = 0.18;
  const pair = sum(
    osc({ shape: "pulse", length: toSamples(seconds), freq: stepHz(ctx.chord.mode, lower) }),
    osc({ shape: "pulse", length: toSamples(seconds), freq: stepHz(ctx.chord.mode, lower + 1), phase: 0.37 }),
  );
  const buzz = crush(scale(pair, 0.5), { bits: 6, hold: 6 });
  const dry = layer([
    { at: 0, signal: buzz },
    { at: 0, signal: noiseBand(ctx.seed, 0.02, 2200, 0.8), gain: 0.8 },
  ]);
  const side = ctx.count > 1 ? (ctx.ordinal / (ctx.count - 1)) * 0.8 - 0.4 : 0;
  return finish("reject", balance(dry, side));
};

const prove: Voice = (ctx) => {
  const lower = stepWithIntervals(ctx.chord.mode, 784 * (4 / 3) ** ctx.ordinal, [MAJOR_THIRD]);
  const low = stepHz(ctx.chord.mode, lower);
  const high = stepHz(ctx.chord.mode, lower + 2);
  const string = pluck({ freq: low * 2, length: toSamples(0.4), seed: ctx.seed, brightness: 0.95, t60: 0.4 });
  const dry = layer([
    { at: 0, signal: pan(bell(low, 0.6, 2.5), -0.3), gain: 0.6 },
    { at: 0, signal: pan(bell(high, 0.6, 2.5), 0.3), gain: 0.6 },
    { at: 0, signal: fade(string, { out: 0.04 }), gain: 0.5 },
  ]);
  return finish("prove", room(dry, 0.3, { t60: 1, damping: 7000, size: 0.6, tail: 0.7 }));
};

const fail: Voice = (ctx) => {
  const lower = stepWithIntervals(ctx.chord.mode, 320, [MINOR_SECOND]);
  const low = stepHz(ctx.chord.mode, lower);
  const pair = sum(beep("pulse", low, 0.25), beep("pulse", stepHz(ctx.chord.mode, lower + 1), 0.25));
  const fallLength = toSamples(0.11);
  const fall = fade(
    osc({ shape: "pulse", length: fallLength, freq: sweepHz(fallLength, low, low / 2, 0.1) }),
    { in: 0.002, out: 0.03 },
  );
  const tones = layer([
    { at: 0, signal: pair, gain: 0.5 },
    { at: 0.25, signal: fall, gain: 0.8 },
  ]);
  const dry = layer([
    { at: 0, signal: mapStereo(tones, (channel) => svf(channel, { mode: "lowpass", cutoff: 2800, q: 0.9 })) },
    { at: 0, signal: noiseBand(ctx.seed + 2, 0.06, 2200, 1.2), gain: 0.5 },
    { at: 0, signal: tick(ctx.seed, 0.004, 2000), gain: 0.4 },
  ]);
  return finish("fail", dry);
};

const gateOpen: Voice = (ctx) => {
  const mode = ctx.chord.mode;
  const [low, middle, high] = triad(ctx.chord, 0);
  const strumSteps = [low + 7, low, high, middle + 7, middle, high + 7];
  const strings = strumSteps.map((step, index) => {
    const string = pluck({
      freq: stepHz(mode, step),
      length: toSamples(1.6),
      seed: ctx.seed + index,
      brightness: 0.85,
      t60: 1.6,
    });
    return {
      at: index * 0.05,
      signal: pan(fade(string, { out: 0.1 }), (index / (strumSteps.length - 1)) * 1.2 - 0.6),
      gain: 0.55,
    };
  });
  const chordLength = toSamples(1.4 + 1.1);
  const stack = [low, middle, high].map((step, index) => ({
    at: 0,
    signal: padNote({
      hz: stepHz(mode, step),
      gate: 1.4,
      attack: 0.004,
      release: 1.1,
      cutoff: settle({ length: chordLength, from: 6000, to: 1500, tau: 0.5 }),
      voices: 5,
      detune: 20,
      seed: ctx.seed + 20 + index,
    }),
    gain: 0.3,
  }));
  const burstLength = toSamples(0.6);
  const burst = noiseBurst(ctx.seed + 3, burstLength, sweepHz(burstLength, 500, 9000, 0.25), 0.5);
  const swellSeconds = 1.2;
  const swellLength = toSamples(swellSeconds);
  const swell = gainStereo(
    noiseBand(ctx.seed + 4, swellSeconds, sweepHz(swellLength, 400, 6000, swellSeconds), 1.2),
    ramp(swellLength, 1.5),
  );
  const dry = layer([
    { at: 0, signal: saturate(thud(180, stepHz(mode, -14), 1.3), 2), gain: 0.6 },
    { at: 0, signal: burst, gain: 1.4 },
    ...stack,
    ...strings,
    { at: 0.3, signal: mapStereo(swell, (channel) => fade(channel, { out: 0.25 })), gain: 0.5 },
  ]);
  return finish("gateOpen", room(dry, 0.35, { t60: 2.2, damping: 6000, size: 1.1, tail: 1.2 }));
};

const rise: Voice = (ctx) => {
  const seconds = Math.min(3, gridSteps(ctx, 16) * ctx.sixteenth);
  const length = toSamples(seconds);
  const lift = ramp(length, 1.6);
  const air = gainStereo(
    noiseBand(ctx.seed, seconds, sweepHz(length, 300, 9000, seconds), 1.4),
    lift,
  );
  const root = stepHz(ctx.chord.mode, rootStepNear(ctx.chord, 147));
  const tone = osc({ shape: "saw", length, freq: sweepHz(length, root, root * 4, seconds), phase: 0.5 });
  const opened = svf(tone, { mode: "lowpass", cutoff: sweepHz(length, 600, 5000, seconds), q: 1.2 });
  const voiced = scale(opened, lift);
  const dry = layer([
    { at: 0, signal: tick(ctx.seed + 1, 0.004, 2500), gain: 0.25 },
    { at: 0, signal: mapStereo(air, (channel) => fade(channel, { out: 0.06 })), gain: 2 },
    { at: 0, signal: fade(voiced, { out: 0.06 }), gain: 0.5 },
  ]);
  return finish("rise", room(dry, 0.3, { t60: 1, damping: 7000, size: 0.8, tail: 0.6 }));
};

const wipe: Voice = (ctx) => {
  const steps = gridSteps(ctx, OWN_STEPS);
  const seconds = steps * ctx.sixteenth;
  const length = toSamples(seconds);
  const held = crush(whiteNoise(length, ctx.seed), { bits: 16, hold: 12 });
  const center = smooth(stepped(length, geometric(500, 7000, steps), length / steps), 400);
  const band = svf(held, { mode: "bandpass", cutoff: center, q: 3 });
  const shaped = fade(scale(band, steppedAccent(length, steps, 0.5)), { out: 0.02 });
  return finish(
    "wipe",
    layer([
      { at: 0, signal: shaped, gain: 2 },
      { at: 0, signal: tick(ctx.seed + 1, 0.003, 3000), gain: 0.3 },
    ]),
  );
};

const TALLY_END_STEP = 14;
const TALLY_RUN_STEP = 7;

const tally: Voice = (ctx) => {
  const steps =
    ctx.span > 0
      ? Array.from({ length: gridSteps(ctx, 1) }, (_, index) => TALLY_RUN_STEP + index)
      : [TALLY_END_STEP - (ctx.count - 1 - ctx.ordinal)];
  const blips = steps.map((step, index) => {
    const last = index === steps.length - 1;
    return {
      at: index * ctx.sixteenth,
      signal: pan(
        blip("sine", stepHz(ctx.chord.mode, step), last ? 0.07 : 0.025),
        last ? 0 : (index % 2) * 0.4 - 0.2,
      ),
      gain: last ? 1 : 0.8,
    };
  });
  return finish("tally", layer(blips));
};

export const SFX: Readonly<Record<SfxId, Voice>> = {
  boot,
  stamp,
  cursor,
  confirm,
  deny,
  type,
  window: windowOpen,
  orbPick,
  slot,
  trigger,
  encounter,
  spawn,
  scan,
  record,
  hit,
  finding,
  fixed,
  gateSlam,
  reject,
  prove,
  fail,
  gateOpen,
  rise,
  wipe,
  tally,
};
