export type Mode = "dorian" | "major";

type Scale = readonly [number, number, number, number, number, number, number];

const SCALES: Readonly<Record<Mode, Scale>> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

const TONIC_HZ = 293.6648;
const STEPS_PER_OCTAVE = 7;

function lookup<T>(table: readonly T[], index: number): T {
  const value = table[index];
  if (value === undefined) throw new RangeError(`Index ${index} is outside a table of ${table.length}`);
  return value;
}

const degreeOf = (step: number): number =>
  ((Math.round(step) % STEPS_PER_OCTAVE) + STEPS_PER_OCTAVE) % STEPS_PER_OCTAVE;

function stepSemitones(mode: Mode, step: number): number {
  const octave = Math.floor(Math.round(step) / STEPS_PER_OCTAVE);
  return lookup(SCALES[mode], degreeOf(step)) + 12 * octave;
}

export const stepHz = (mode: Mode, step: number): number =>
  TONIC_HZ * 2 ** (stepSemitones(mode, step) / 12);

export interface Chord {
  readonly mode: Mode;
  readonly root: number;
}

export const chord = (mode: Mode, root: number): Chord => ({ mode, root: degreeOf(root) });

export const DORIAN_TONIC: Chord = chord("dorian", 0);

type Tones = readonly [number, number, number];

function closePosition(tones: Tones, floor: number): Tones {
  const raise = (tone: number): number =>
    tone + STEPS_PER_OCTAVE * Math.ceil((floor - tone) / STEPS_PER_OCTAVE);
  const a = raise(tones[0]);
  const b = raise(tones[1]);
  const c = raise(tones[2]);
  const low = Math.min(a, b, c);
  const high = Math.max(a, b, c);
  return [low, a + b + c - low - high, high];
}

export const triad = (of: Chord, floor: number): Tones =>
  closePosition([of.root, of.root + 2, of.root + 4], floor);

export const sus2 = (of: Chord, floor: number): Tones =>
  closePosition([of.root, of.root + 1, of.root + 4], floor);

export const bassStep = (of: Chord): number => (of.root <= 2 ? of.root - 14 : of.root - 21);

const SEARCH_LOW = -28;
const SEARCH_HIGH = 35;

const stepsInRange = (): number[] =>
  Array.from({ length: SEARCH_HIGH - SEARCH_LOW + 1 }, (_, i) => SEARCH_LOW + i);

function nearest(mode: Mode, steps: readonly number[], hz: number): number {
  const distance = (step: number): number => Math.abs(Math.log2(stepHz(mode, step) / hz));
  return steps.reduce((best, step) => (distance(step) < distance(best) ? step : best), lookup(steps, 0));
}

function chordSteps(of: Chord): number[] {
  const tones = new Set([of.root, of.root + 2, of.root + 4].map(degreeOf));
  return stepsInRange().filter((step) => tones.has(degreeOf(step)));
}

function chordStepNear(of: Chord, hz: number, offset = 0): number {
  const steps = chordSteps(of);
  const index = steps.indexOf(nearest(of.mode, steps, hz)) + Math.round(offset);
  return lookup(steps, Math.min(steps.length - 1, Math.max(0, index)));
}

export const chordHzNear = (of: Chord, hz: number, offset = 0): number =>
  stepHz(of.mode, chordStepNear(of, hz, offset));

export function rootStepNear(of: Chord, hz: number): number {
  return nearest(
    of.mode,
    stepsInRange().filter((step) => degreeOf(step) === of.root),
    hz,
  );
}

export const scaleStepNear = (mode: Mode, hz: number): number => nearest(mode, stepsInRange(), hz);

export interface Interval {
  readonly semitones: number;
  readonly span: number;
}

export const MINOR_SECOND: Interval = { semitones: 1, span: 1 };
export const MAJOR_THIRD: Interval = { semitones: 4, span: 2 };
export const PERFECT_FIFTH: Interval = { semitones: 7, span: 4 };

export function stepWithIntervals(mode: Mode, hz: number, intervals: readonly Interval[]): number {
  const fits = stepsInRange().filter((step) =>
    intervals.every(
      ({ semitones, span }) => stepSemitones(mode, step + span) - stepSemitones(mode, step) === semitones,
    ),
  );
  if (fits.length === 0) throw new RangeError(`No step of the ${mode} scale has these intervals above it.`);
  return nearest(mode, fits, hz);
}

export interface MotifNote {
  readonly step: number;
  readonly sixteenths: number;
}

export const MOTIF: readonly [MotifNote, MotifNote, MotifNote, MotifNote] = [
  { step: 4, sixteenths: 6 },
  { step: 2, sixteenths: 6 },
  { step: 0, sixteenths: 4 },
  { step: 8, sixteenths: 16 },
];

export const MOTIF_CELL: readonly [MotifNote, MotifNote, MotifNote] = [MOTIF[0], MOTIF[1], MOTIF[2]];
