export const SAMPLE_RATE = 48_000;

const TAU = 2 * Math.PI;

export interface Stereo {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export type Param = number | Float32Array;

function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`);
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const read = (param: Param, index: number): number =>
  typeof param === "number" ? param : (param[index] ?? 0);

export const toSamples = (seconds: number, sampleRate: number = SAMPLE_RATE): number =>
  Math.max(0, Math.round(seconds * sampleRate));

export const dbToGain = (db: number): number => 10 ** (db / 20);

export const gainToDb = (gain: number): number => 20 * Math.log10(Math.max(gain, 1e-12));

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function whiteNoise(length: number, seed: number): Float32Array {
  const next = mulberry32(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = next() * 2 - 1;
  return out;
}

export type Shape = "sine" | "saw" | "pulse" | "triangle";

export interface OscArgs {
  readonly shape: Shape;
  readonly length: number;
  readonly freq: Param;
  readonly phase?: number;
  readonly width?: number;
  readonly sampleRate?: number;
}

const wrapPhase = (phase: number): number => phase - Math.floor(phase);

function blep(t: number, dt: number): number {
  if (dt <= 0) return 0;
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

function blamp(t: number, dt: number): number {
  if (dt <= 0) return 0;
  if (t < dt) {
    const x = 1 - t / dt;
    return (x * x * x) / 6;
  }
  if (t > 1 - dt) {
    const x = 1 - (1 - t) / dt;
    return (x * x * x) / 6;
  }
  return 0;
}

function waveAt(shape: Shape, phase: number, dt: number, width: number): number {
  switch (shape) {
    case "sine":
      return Math.sin(TAU * phase);
    case "saw":
      return 2 * phase - 1 - blep(phase, dt);
    case "pulse":
      return (
        (phase < width ? 1 : -1) +
        blep(phase, dt) -
        blep(wrapPhase(phase - width), dt) -
        (2 * width - 1)
      );
    case "triangle":
      return (
        1 -
        4 * Math.abs(phase - 0.5) +
        8 * dt * (blamp(phase, dt) - blamp(wrapPhase(phase - 0.5), dt))
      );
    default:
      return assertNever(shape);
  }
}

export function osc(args: OscArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const width = clamp(args.width ?? 0.5, 0.02, 0.98);
  const out = new Float32Array(args.length);
  let phase = wrapPhase(args.phase ?? 0);
  for (let i = 0; i < out.length; i++) {
    const dt = clamp(read(args.freq, i) / sampleRate, 0, 0.49);
    out[i] = waveAt(args.shape, phase, dt, width);
    phase += dt;
    if (phase >= 1) phase -= 1;
  }
  return out;
}

export interface FmArgs {
  readonly length: number;
  readonly carrier: Param;
  readonly ratio: number;
  readonly index: Param;
  readonly sampleRate?: number;
}

export function fm(args: FmArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const out = new Float32Array(args.length);
  let carrierPhase = 0;
  let modulatorPhase = 0;
  for (let i = 0; i < out.length; i++) {
    const hz = read(args.carrier, i);
    out[i] = Math.sin(TAU * carrierPhase + read(args.index, i) * Math.sin(TAU * modulatorPhase));
    carrierPhase = wrapPhase(carrierPhase + hz / sampleRate);
    modulatorPhase = wrapPhase(modulatorPhase + (hz * args.ratio) / sampleRate);
  }
  return out;
}

export interface PluckArgs {
  readonly freq: number;
  readonly length: number;
  readonly seed: number;
  readonly brightness: number;
  readonly t60: number;
  readonly pick?: number;
  readonly sampleRate?: number;
}

export function pluck(args: PluckArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const brightness = clamp(args.brightness, 0, 1);
  const period = sampleRate / args.freq;
  const blend = 0.05 + 0.45 * (1 - brightness);
  let whole = Math.floor(period - blend);
  let fraction = period - blend - whole;
  if (fraction < 0.1) {
    whole -= 1;
    fraction += 1;
  }
  whole = Math.max(2, whole);
  const allpass = (1 - fraction) / (1 + fraction);
  const loopGain = 10 ** (-3 / (args.freq * Math.max(args.t60, 0.01)));

  const burst = onePoleLowpass(whiteNoise(whole, args.seed), 900 + 9000 * brightness, sampleRate);
  const offset = Math.round(clamp(args.pick ?? 0.18, 0, 0.5) * whole);
  const line = new Float32Array(whole);
  let mean = 0;
  for (let i = 0; i < whole; i++) {
    const value = (burst[i] ?? 0) - (offset > 0 && i >= offset ? (burst[i - offset] ?? 0) : 0);
    line[i] = value;
    mean += value / whole;
  }
  let top = 0;
  for (let i = 0; i < whole; i++) {
    const value = (line[i] ?? 0) - mean;
    line[i] = value;
    top = Math.max(top, Math.abs(value));
  }
  const scale = top > 0 ? 1 / top : 0;
  for (let i = 0; i < whole; i++) line[i] = (line[i] ?? 0) * scale;

  const out = new Float32Array(args.length);
  let index = 0;
  let previous = 0;
  let allpassIn = 0;
  let allpassOut = 0;
  for (let i = 0; i < out.length; i++) {
    const current = line[index] ?? 0;
    out[i] = current;
    const low = (1 - blend) * current + blend * previous;
    previous = current;
    const tuned = allpass * low + allpassIn - allpass * allpassOut;
    allpassIn = low;
    allpassOut = tuned;
    line[index] = tuned * loopGain;
    index = index + 1 === whole ? 0 : index + 1;
  }
  return out;
}

export interface AdsrArgs {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
  readonly gate: number;
  readonly sampleRate?: number;
}

export function adsr(args: AdsrArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const attack = Math.max(args.attack, 1 / sampleRate);
  const release = Math.max(args.release, 1 / sampleRate);
  const decayRate = 4.6 / Math.max(args.decay, 1 / sampleRate);
  const held = (t: number): number =>
    t < attack
      ? t / attack
      : args.sustain + (1 - args.sustain) * Math.exp(-(t - attack) * decayRate);
  const atOff = held(args.gate);
  const out = new Float32Array(toSamples(args.gate + release, sampleRate));
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    if (t < args.gate) {
      out[i] = held(t);
    } else {
      const x = Math.min(1, (t - args.gate) / release);
      out[i] = atOff * (1 - x) * Math.exp(-3 * x);
    }
  }
  return out;
}

export interface SwellArgs {
  readonly attack: number;
  readonly release: number;
  readonly gate: number;
  readonly sampleRate?: number;
}

export function swell(args: SwellArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const attack = Math.max(args.attack, 1 / sampleRate);
  const release = Math.max(args.release, 1 / sampleRate);
  const out = new Float32Array(toSamples(args.gate + release, sampleRate));
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    const rise = Math.sin((Math.PI / 2) * Math.min(1, t / attack));
    const fall = t < args.gate ? 1 : Math.cos((Math.PI / 2) * Math.min(1, (t - args.gate) / release));
    out[i] = rise * fall;
  }
  return out;
}

export function decay(length: number, t60: number, sampleRate: number = SAMPLE_RATE): Float32Array {
  const rate = 6.908 / (Math.max(t60, 1e-4) * sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = Math.exp(-i * rate);
  return out;
}

export interface GlideArgs {
  readonly length: number;
  readonly from: number;
  readonly to: number;
  readonly seconds: number;
  readonly curve: "exp" | "linear";
  readonly sampleRate?: number;
}

export function glide(args: GlideArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const span = Math.max(1, args.seconds * sampleRate);
  const out = new Float32Array(args.length);
  const ratio = args.to / args.from;
  for (let i = 0; i < out.length; i++) {
    const x = Math.min(1, i / span);
    out[i] = args.curve === "exp" ? args.from * ratio ** x : args.from + (args.to - args.from) * x;
  }
  return out;
}

export interface SettleArgs {
  readonly length: number;
  readonly from: number;
  readonly to: number;
  readonly tau: number;
  readonly sampleRate?: number;
}

export function settle(args: SettleArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const rate = 1 / (Math.max(args.tau, 1e-5) * sampleRate);
  const out = new Float32Array(args.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = args.to + (args.from - args.to) * Math.exp(-i * rate);
  }
  return out;
}

export function stepped(
  length: number,
  values: readonly number[],
  stepSamples: number,
): Float32Array {
  const out = new Float32Array(length);
  const last = values.length - 1;
  for (let i = 0; i < length; i++) {
    out[i] = values[Math.min(last, Math.floor(i / stepSamples))] ?? 0;
  }
  return out;
}

export function geometric(from: number, to: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    count === 1 ? from : from * (to / from) ** (i / (count - 1)),
  );
}

export interface FadeArgs {
  readonly in?: number;
  readonly out?: number;
  readonly sampleRate?: number;
}

export function fade(input: Float32Array, args: FadeArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const length = input.length;
  const fadeIn = Math.min(length, toSamples(args.in ?? 0, sampleRate));
  const fadeOut = Math.min(length, toSamples(args.out ?? 0, sampleRate));
  const out = new Float32Array(input);
  for (let i = 0; i < fadeIn; i++) {
    out[i] = (out[i] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / fadeIn));
  }
  for (let i = 0; i < fadeOut; i++) {
    const at = length - 1 - i;
    out[at] = (out[at] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / fadeOut));
  }
  return out;
}

export function onePoleLowpass(
  input: Float32Array,
  cutoff: Param,
  sampleRate: number = SAMPLE_RATE,
): Float32Array {
  const out = new Float32Array(input.length);
  let state = 0;
  let lastCutoff = Number.NaN;
  let coefficient = 0;
  for (let i = 0; i < out.length; i++) {
    const hz = read(cutoff, i);
    if (hz !== lastCutoff) {
      coefficient = 1 - Math.exp((-TAU * clamp(hz, 1, sampleRate * 0.49)) / sampleRate);
      lastCutoff = hz;
    }
    state += coefficient * ((input[i] ?? 0) - state);
    out[i] = state;
  }
  return out;
}

export function smooth(
  input: Float32Array,
  cutoff: number,
  sampleRate: number = SAMPLE_RATE,
): Float32Array {
  const coefficient = 1 - Math.exp((-TAU * cutoff) / sampleRate);
  const out = new Float32Array(input.length);
  let state = input[0] ?? 0;
  for (let i = 0; i < out.length; i++) {
    state += coefficient * ((input[i] ?? 0) - state);
    out[i] = state;
  }
  return out;
}

function onePoleHighpass(
  input: Float32Array,
  cutoff: Param,
  sampleRate: number = SAMPLE_RATE,
): Float32Array {
  const low = onePoleLowpass(input, cutoff, sampleRate);
  const out = new Float32Array(input.length);
  for (let i = 0; i < out.length; i++) out[i] = (input[i] ?? 0) - (low[i] ?? 0);
  return out;
}

export type FilterMode = "lowpass" | "highpass" | "bandpass" | "notch";

export interface SvfArgs {
  readonly mode: FilterMode;
  readonly cutoff: Param;
  readonly q?: number;
  readonly sampleRate?: number;
}

function svfMix(mode: FilterMode, k: number): readonly [number, number, number] {
  switch (mode) {
    case "lowpass":
      return [0, 0, 1];
    case "highpass":
      return [1, -k, -1];
    case "bandpass":
      return [0, k, 0];
    case "notch":
      return [1, -k, 0];
    default:
      return assertNever(mode);
  }
}

export function svf(input: Float32Array, args: SvfArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const k = 1 / Math.max(0.3, args.q ?? Math.SQRT1_2);
  const [m0, m1, m2] = svfMix(args.mode, k);
  const out = new Float32Array(input.length);
  let ic1 = 0;
  let ic2 = 0;
  let lastCutoff = Number.NaN;
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  for (let i = 0; i < out.length; i++) {
    const hz = read(args.cutoff, i);
    if (hz !== lastCutoff) {
      const g = Math.tan((Math.PI * clamp(hz, 10, sampleRate * 0.45)) / sampleRate);
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
      lastCutoff = hz;
    }
    const x = input[i] ?? 0;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = m0 * x + m1 * v1 + m2 * v2;
  }
  return out;
}

export function dcBlock(input: Float32Array, sampleRate: number = SAMPLE_RATE): Float32Array {
  return onePoleHighpass(input, 12, sampleRate);
}

export function lowShelf(
  input: Float32Array,
  hz: number,
  db: number,
  sampleRate: number = SAMPLE_RATE,
): Float32Array {
  const low = onePoleLowpass(input, hz, sampleRate);
  const extra = dbToGain(db) - 1;
  const out = new Float32Array(input.length);
  for (let i = 0; i < out.length; i++) out[i] = (input[i] ?? 0) + extra * (low[i] ?? 0);
  return out;
}

export interface CrushArgs {
  readonly bits: number;
  readonly hold: number;
}

export function crush(input: Float32Array, args: CrushArgs): Float32Array {
  const levels = 2 ** (args.bits - 1);
  const hold = Math.max(1, Math.round(args.hold));
  const out = new Float32Array(input.length);
  let held = 0;
  for (let i = 0; i < out.length; i++) {
    if (i % hold === 0) held = Math.round((input[i] ?? 0) * levels) / levels;
    out[i] = held;
  }
  return out;
}

export function saturate(input: Float32Array, drive: number): Float32Array {
  const norm = 1 / Math.tanh(drive);
  const out = new Float32Array(input.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh((input[i] ?? 0) * drive) * norm;
  return out;
}

export function scale(input: Float32Array, gain: Param): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < out.length; i++) out[i] = (input[i] ?? 0) * read(gain, i);
  return out;
}

export function sum(...inputs: readonly Float32Array[]): Float32Array {
  const out = new Float32Array(Math.max(0, ...inputs.map((input) => input.length)));
  for (const input of inputs) {
    for (let i = 0; i < input.length; i++) out[i] = (out[i] ?? 0) + (input[i] ?? 0);
  }
  return out;
}

function resize(input: Float32Array, length: number): Float32Array {
  const out = new Float32Array(length);
  out.set(input.subarray(0, Math.min(length, input.length)));
  return out;
}

export const toStereo = (mono: Float32Array): Stereo => ({ left: mono, right: mono });

export function pan(mono: Float32Array, position: number): Stereo {
  const angle = ((clamp(position, -1, 1) + 1) * Math.PI) / 4;
  return { left: scale(mono, Math.cos(angle) * Math.SQRT2), right: scale(mono, Math.sin(angle) * Math.SQRT2) };
}

export function balance(signal: Stereo, position: number): Stereo {
  const side = clamp(position, -1, 1);
  return { left: scale(signal.left, 1 - Math.max(0, side)), right: scale(signal.right, 1 + Math.min(0, side)) };
}

export const mapStereo = (signal: Stereo, each: (channel: Float32Array) => Float32Array): Stereo => ({
  left: each(signal.left),
  right: each(signal.right),
});

export const gainStereo = (signal: Stereo, gain: Param): Stereo =>
  mapStereo(signal, (channel) => scale(channel, gain));

export interface Clip {
  readonly at: number;
  readonly signal: Stereo;
  readonly gain?: number;
}

export function mixdown(length: number, clips: readonly Clip[]): Stereo {
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (const clip of clips) {
    const gain = clip.gain ?? 1;
    const at = Math.round(clip.at);
    const start = Math.max(0, -at);
    const end = Math.min(clip.signal.left.length, clip.signal.right.length, length - at);
    const sourceLeft = clip.signal.left;
    const sourceRight = clip.signal.right;
    for (let i = start; i < end; i++) {
      left[at + i] = (left[at + i] ?? 0) + gain * (sourceLeft[i] ?? 0);
      right[at + i] = (right[at + i] ?? 0) + gain * (sourceRight[i] ?? 0);
    }
  }
  return { left, right };
}

export function monoBelow(signal: Stereo, hz: number, sampleRate: number = SAMPLE_RATE): Stereo {
  const length = signal.left.length;
  const side = new Float32Array(length);
  for (let i = 0; i < length; i++) side[i] = ((signal.left[i] ?? 0) - (signal.right[i] ?? 0)) / 2;
  let high: Float32Array = side;
  for (let pass = 0; pass < 3; pass++) high = svf(high, { mode: "highpass", cutoff: hz, sampleRate });
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const mid = ((signal.left[i] ?? 0) + (signal.right[i] ?? 0)) / 2;
    left[i] = mid + (high[i] ?? 0);
    right[i] = mid - (high[i] ?? 0);
  }
  return { left, right };
}

export interface EchoArgs {
  readonly seconds: number;
  readonly feedback: number;
  readonly damping: number;
  readonly tail: number;
  readonly sampleRate?: number;
}

export function echo(input: Stereo, args: EchoArgs): Stereo {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const delay = Math.max(1, toSamples(args.seconds, sampleRate));
  const length = input.left.length + toSamples(args.tail, sampleRate);
  const coefficient = 1 - Math.exp((-TAU * args.damping) / sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  let lowLeft = 0;
  let lowRight = 0;
  for (let i = delay; i < length; i++) {
    const source = ((input.left[i - delay] ?? 0) + (input.right[i - delay] ?? 0)) / 2;
    lowLeft += coefficient * ((right[i - delay] ?? 0) - lowLeft);
    lowRight += coefficient * ((left[i - delay] ?? 0) - lowRight);
    left[i] = source + args.feedback * lowLeft;
    right[i] = args.feedback * lowRight;
  }
  return { left, right };
}

export interface ReverbArgs {
  readonly t60: number;
  readonly damping: number;
  readonly size: number;
  readonly predelay: number;
  readonly tail: number;
  readonly sampleRate?: number;
}

const FDN_LINES = [1423, 1637, 1811, 2053, 2311, 2579, 2833, 3121] as const;
const DIFFUSER_LINES = [
  [229, 557, 443],
  [211, 577, 431],
] as const;
const DIFFUSION = 0.62;

function diffuse(input: Float32Array, lengths: readonly number[], scaleBy: number): Float32Array {
  return lengths.reduce((signal, base) => {
    const size = Math.max(1, Math.round(base * scaleBy));
    const memory = new Float32Array(size);
    const out = new Float32Array(signal.length);
    let index = 0;
    for (let i = 0; i < out.length; i++) {
      const delayed = memory[index] ?? 0;
      const feed = (signal[i] ?? 0) + DIFFUSION * delayed;
      out[i] = delayed - DIFFUSION * feed;
      memory[index] = feed;
      index = index + 1 === size ? 0 : index + 1;
    }
    return out;
  }, input);
}

export function reverb(input: Stereo, args: ReverbArgs): Stereo {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const rate = sampleRate / SAMPLE_RATE;
  const length = input.left.length + toSamples(args.tail, sampleRate);
  const predelay = toSamples(args.predelay, sampleRate);
  const feeds = [
    diffuse(resize(input.left, length), DIFFUSER_LINES[0], rate),
    diffuse(resize(input.right, length), DIFFUSER_LINES[1], rate),
  ] as const;
  const sizes = FDN_LINES.map((base) => Math.max(2, Math.round(base * args.size * rate)));
  const lines = sizes.map((size) => new Float32Array(size));
  const gains = sizes.map((size) => 10 ** ((-3 * size) / (sampleRate * Math.max(args.t60, 0.05))));
  const damping = 1 - Math.exp((-TAU * clamp(args.damping, 200, sampleRate * 0.45)) / sampleRate);
  const heads = new Int32Array(8);
  const low = new Float64Array(8);
  const taps = new Float64Array(8);
  const norm = 1 / Math.sqrt(8);
  const left = new Float32Array(length);
  const right = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    for (let line = 0; line < 8; line++) {
      const value = lines[line]?.[heads[line] ?? 0] ?? 0;
      const smoothed = (low[line] ?? 0) + damping * (value - (low[line] ?? 0));
      low[line] = smoothed;
      taps[line] = smoothed;
    }
    left[i] = 0.5 * ((taps[0] ?? 0) - (taps[2] ?? 0) + (taps[4] ?? 0) - (taps[6] ?? 0));
    right[i] = 0.5 * ((taps[1] ?? 0) - (taps[3] ?? 0) + (taps[5] ?? 0) - (taps[7] ?? 0));

    for (let half = 1; half < 8; half *= 2) {
      for (let block = 0; block < 8; block += half * 2) {
        for (let j = block; j < block + half; j++) {
          const a = taps[j] ?? 0;
          const b = taps[j + half] ?? 0;
          taps[j] = a + b;
          taps[j + half] = a - b;
        }
      }
    }

    const sourceLeft = i >= predelay ? (feeds[0][i - predelay] ?? 0) : 0;
    const sourceRight = i >= predelay ? (feeds[1][i - predelay] ?? 0) : 0;
    for (let line = 0; line < 8; line++) {
      const buffer = lines[line];
      const head = heads[line] ?? 0;
      if (buffer === undefined) continue;
      buffer[head] =
        (taps[line] ?? 0) * norm * (gains[line] ?? 0) + (line % 2 === 0 ? sourceLeft : sourceRight);
      heads[line] = head + 1 === buffer.length ? 0 : head + 1;
    }
  }
  return { left, right };
}

export function peak(signal: Stereo): number {
  let top = 0;
  for (let i = 0; i < signal.left.length; i++) {
    top = Math.max(top, Math.abs(signal.left[i] ?? 0), Math.abs(signal.right[i] ?? 0));
  }
  return top;
}

export function rms(signal: Stereo, start = 0, end: number = signal.left.length): number {
  const from = clamp(Math.round(start), 0, signal.left.length);
  const to = clamp(Math.round(end), from, signal.left.length);
  if (to === from) return 0;
  let total = 0;
  for (let i = from; i < to; i++) {
    const l = signal.left[i] ?? 0;
    const r = signal.right[i] ?? 0;
    total += l * l + r * r;
  }
  return Math.sqrt(total / (2 * (to - from)));
}

const OVERSAMPLE = 8;
const OVERSAMPLE_HALF_WIDTH = 32;
const PEAK_CANDIDATE = 0.5;
const OVERSAMPLE_PHASES = Array.from({ length: OVERSAMPLE - 1 }, (_, phase) => {
  const offset = (phase + 1) / OVERSAMPLE;
  return Array.from({ length: OVERSAMPLE_HALF_WIDTH * 2 }, (_, tap) => {
    const x = tap - (OVERSAMPLE_HALF_WIDTH - 1) - offset;
    const turn = (Math.PI * x) / OVERSAMPLE_HALF_WIDTH;
    const window = 0.42 + 0.5 * Math.cos(turn) + 0.08 * Math.cos(2 * turn);
    return (Math.sin(Math.PI * x) / (Math.PI * x)) * window;
  });
});

function truePeakOf(channel: Float32Array): number {
  let top = 0;
  for (let i = 0; i < channel.length; i++) top = Math.max(top, Math.abs(channel[i] ?? 0));
  const candidate = top * PEAK_CANDIDATE;
  let peakBetween = top;
  for (let i = 0; i < channel.length - 1; i++) {
    if (Math.abs(channel[i] ?? 0) < candidate && Math.abs(channel[i + 1] ?? 0) < candidate) continue;
    for (const taps of OVERSAMPLE_PHASES) {
      let value = 0;
      for (let tap = 0; tap < taps.length; tap++) {
        value += (taps[tap] ?? 0) * (channel[i + tap - (OVERSAMPLE_HALF_WIDTH - 1)] ?? 0);
      }
      peakBetween = Math.max(peakBetween, Math.abs(value));
    }
  }
  return peakBetween;
}

export const truePeak = (signal: Stereo): number =>
  Math.max(truePeakOf(signal.left), truePeakOf(signal.right));

function biquad(
  input: Float32Array,
  b: readonly [number, number, number],
  a: readonly [number, number],
): Float64Array {
  const out = new Float64Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < out.length; i++) {
    const x = input[i] ?? 0;
    const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

// K-weighting of ITU-R BS.1770 for 48 kHz: a high shelf, then a high-pass.
const K_SHELF_B = [1.53512485958697, -2.69169618940638, 1.19839281085285] as const;
const K_SHELF_A = [-1.69065929318241, 0.73248077421585] as const;
const K_HIGHPASS_B = [1, -2, 1] as const;
const K_HIGHPASS_A = [-1.99004745483398, 0.99007225036621] as const;
const LOUDNESS_BLOCK_SECONDS = 0.4;
const LOUDNESS_HOP_SECONDS = 0.1;
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = -10;

export function integratedLoudness(signal: Stereo): number {
  const weighted = [signal.left, signal.right].map((channel) => {
    const shelved = biquad(channel, K_SHELF_B, K_SHELF_A);
    return biquad(Float32Array.from(shelved), K_HIGHPASS_B, K_HIGHPASS_A);
  });
  const block = toSamples(LOUDNESS_BLOCK_SECONDS);
  const hop = toSamples(LOUDNESS_HOP_SECONDS);
  const powers: number[] = [];
  for (let at = 0; at + block <= signal.left.length; at += hop) {
    let total = 0;
    for (const channel of weighted) {
      for (let i = at; i < at + block; i++) total += (channel[i] ?? 0) ** 2;
    }
    powers.push(total / block);
  }
  const toLufs = (power: number): number => -0.691 + 10 * Math.log10(Math.max(power, 1e-12));
  const mean = (values: readonly number[]): number =>
    values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  const heard = powers.filter((power) => toLufs(power) > ABSOLUTE_GATE_LUFS);
  const gate = toLufs(mean(heard)) + RELATIVE_GATE_LU;
  return toLufs(mean(heard.filter((power) => toLufs(power) > gate)));
}

export interface LimiterArgs {
  readonly ceiling: number;
  readonly knee: number;
  readonly lookahead: number;
  readonly release: number;
  readonly sampleRate?: number;
}

export function limiterGain(signal: Stereo, args: LimiterArgs): Float32Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const length = signal.left.length;
  const threshold = args.ceiling * clamp(args.knee, 0, 0.999);
  const room = args.ceiling - threshold;
  const gain = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const level = Math.max(Math.abs(signal.left[i] ?? 0), Math.abs(signal.right[i] ?? 0));
    gain[i] =
      level <= threshold ? 1 : (threshold + room * Math.tanh((level - threshold) / room)) / level;
  }
  const attackStep = 1 / Math.max(1, toSamples(args.lookahead, sampleRate));
  for (let i = length - 2; i >= 0; i--) {
    gain[i] = Math.min(gain[i] ?? 1, (gain[i + 1] ?? 1) + attackStep);
  }
  const recover = 1 - Math.exp(-1 / Math.max(1, args.release * sampleRate));
  let current = 1;
  for (let i = 0; i < length; i++) {
    current = Math.min(gain[i] ?? 1, current + (1 - current) * recover);
    gain[i] = current;
  }
  return gain;
}

export interface WavArgs {
  readonly sampleRate?: number;
  readonly ditherSeed: number;
}

const WAV_HEADER_BYTES = 44;
const SILENCE_STEPS = 0.25;
const WAV_BYTES_PER_SAMPLE = 2;
const WAV_CHANNELS = 2;

export function encodeWav(signal: Stereo, args: WavArgs): Uint8Array {
  const sampleRate = args.sampleRate ?? SAMPLE_RATE;
  const frames = Math.min(signal.left.length, signal.right.length);
  const blockAlign = WAV_CHANNELS * WAV_BYTES_PER_SAMPLE;
  const dataBytes = frames * blockAlign;
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  const tag = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, WAV_CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, WAV_BYTES_PER_SAMPLE * 8, true);
  tag(36, "data");
  view.setUint32(40, dataBytes, true);

  const next = mulberry32(args.ditherSeed);
  const quantize = (value: number): number => {
    const dither = next() - next();
    const steps = value * 32767;
    return Math.abs(steps) < SILENCE_STEPS ? 0 : clamp(Math.round(steps + dither), -32768, 32767);
  };
  for (let i = 0; i < frames; i++) {
    const offset = WAV_HEADER_BYTES + i * blockAlign;
    view.setInt16(offset, quantize(signal.left[i] ?? 0), true);
    view.setInt16(offset + WAV_BYTES_PER_SAMPLE, quantize(signal.right[i] ?? 0), true);
  }
  return bytes;
}
