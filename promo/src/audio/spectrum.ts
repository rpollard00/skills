export const PITCH_CLASS_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export type PitchClassName = (typeof PITCH_CLASS_NAMES)[number];

/** The length must be a power of two. */
function fft(real: Float64Array, imaginary: Float64Array): void {
  const size = real.length;
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const r = real[i] ?? 0;
      real[i] = real[j] ?? 0;
      real[j] = r;
      const m = imaginary[i] ?? 0;
      imaginary[i] = imaginary[j] ?? 0;
      imaginary[j] = m;
    }
  }
  for (let width = 2; width <= size; width *= 2) {
    const angle = (-2 * Math.PI) / width;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < size; start += width) {
      let turnReal = 1;
      let turnImaginary = 0;
      for (let k = 0; k < width / 2; k++) {
        const a = start + k;
        const b = a + width / 2;
        const br = (real[b] ?? 0) * turnReal - (imaginary[b] ?? 0) * turnImaginary;
        const bi = (real[b] ?? 0) * turnImaginary + (imaginary[b] ?? 0) * turnReal;
        real[b] = (real[a] ?? 0) - br;
        imaginary[b] = (imaginary[a] ?? 0) - bi;
        real[a] = (real[a] ?? 0) + br;
        imaginary[a] = (imaginary[a] ?? 0) + bi;
        const nextReal = turnReal * stepReal - turnImaginary * stepImaginary;
        turnImaginary = turnReal * stepImaginary + turnImaginary * stepReal;
        turnReal = nextReal;
      }
    }
  }
}

export interface SpectrumArgs {
  readonly start: number;
  readonly end: number;
  readonly size: number;
  readonly hop: number;
}

export function powerSpectrum(signal: Float32Array, args: SpectrumArgs): Float64Array {
  const { size, hop } = args;
  const power = new Float64Array(size / 2);
  const window = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  const starts: number[] = [];
  for (let at = args.start; at + size <= args.end; at += hop) starts.push(at);
  if (starts.length === 0) starts.push(args.start);
  for (const at of starts) {
    for (let i = 0; i < size; i++) {
      const index = at + i;
      real[i] = index < args.end ? (signal[index] ?? 0) * (window[i] ?? 0) : 0;
      imaginary[i] = 0;
    }
    fft(real, imaginary);
    for (let k = 0; k < power.length; k++) {
      power[k] = (power[k] ?? 0) + (real[k] ?? 0) ** 2 + (imaginary[k] ?? 0) ** 2;
    }
  }
  const windows = starts.length;
  for (let k = 0; k < power.length; k++) power[k] = (power[k] ?? 0) / windows;
  return power;
}

export interface NoteArgs {
  readonly sampleRate: number;
  readonly low: number;
  readonly high: number;
  readonly floorWidth: number;
}

export interface ClassPower {
  readonly notes: readonly number[];
  readonly overtones: readonly number[];
}

const FIFTH_HARMONIC_CENTS = -13.7;
const WINDOW_LOW_CENTS = -28;
const WINDOW_HIGH_CENTS = 14;

export function tonalPower(power: Float64Array, floorWidth: number, from: number, to: number): Float64Array {
  const half = Math.floor(floorWidth / 2);
  const tonal = new Float64Array(power.length);
  for (let k = Math.max(0, from); k <= Math.min(power.length - 1, to); k++) {
    const around = Array.from(power.subarray(Math.max(0, k - half), Math.min(power.length, k + half + 1))).sort(
      (a, b) => a - b,
    );
    tonal[k] = Math.max(0, (power[k] ?? 0) - 2 * (around[Math.floor(around.length / 2)] ?? 0));
  }
  return tonal;
}

export function noteClassPower(power: Float64Array, args: NoteArgs): ClassPower {
  const binHz = args.sampleRate / (power.length * 2);
  const firstBin = Math.floor(args.low / binHz) - 8;
  const tonal = tonalPower(power, args.floorWidth, firstBin, Math.ceil(args.high / binHz) + 8);
  const notes = new Array<number>(12).fill(0);
  const overtones = new Array<number>(12).fill(0);
  const first = Math.ceil(12 * Math.log2(args.low / 440));
  const last = Math.floor(12 * Math.log2(args.high / 440));
  for (let semitone = first; semitone <= last; semitone++) {
    const center = 440 * 2 ** (semitone / 12);
    let total = 0;
    let moment = 0;
    const from = Math.ceil((center * 2 ** (WINDOW_LOW_CENTS / 1200)) / binHz);
    const to = Math.floor((center * 2 ** (WINDOW_HIGH_CENTS / 1200)) / binHz);
    for (let k = from; k <= to; k++) {
      const value = tonal[k] ?? 0;
      total += value;
      moment += value * 1200 * Math.log2((k * binHz) / center);
    }
    if (total <= 0) continue;
    const share = Math.min(1, Math.max(0, (moment / total - FIFTH_HARMONIC_CENTS) / -FIFTH_HARMONIC_CENTS));
    const pitchClass = (((semitone + 9) % 12) + 12) % 12;
    notes[pitchClass] = (notes[pitchClass] ?? 0) + total * share;
    overtones[pitchClass] = (overtones[pitchClass] ?? 0) + total * (1 - share);
  }
  return { notes, overtones };
}
