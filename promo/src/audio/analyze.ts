import { readFileSync } from "node:fs";
import type { AudioView } from "../timeline";
import { gainToDb, peak, rms, SAMPLE_RATE, type Stereo, svf } from "./dsp";
import type { MusicId, SfxId } from "./ids";
import { scheduledVoices } from "./score";
import { SFX } from "./sfx";
import {
  noteClassPower,
  PITCH_CLASS_NAMES,
  type PitchClassName,
  powerSpectrum,
  tonalPower,
} from "./spectrum";

interface WavFile {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bits: number;
  readonly signal: Stereo;
}

function parseWav(bytes: Uint8Array): WavFile {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number): string => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("Not a RIFF WAVE file.");
  }
  let format: { sampleRate: number; channels: number; bits: number } | undefined;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (tag(offset) === "fmt ") {
      if (view.getUint16(body, true) !== 1) throw new Error("The WAV file is not PCM.");
      format = {
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    }
    if (tag(offset) === "data") {
      if (format === undefined) throw new Error("The WAV data chunk comes before the format chunk.");
      if (format.channels !== 2 || format.bits !== 16) {
        throw new Error(`Expected 16-bit stereo, found ${format.bits}-bit with ${format.channels} channels.`);
      }
      const frames = Math.floor(Math.min(size, bytes.length - body) / 4);
      const left = new Float32Array(frames);
      const right = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        left[i] = view.getInt16(body + i * 4, true) / 32768;
        right[i] = view.getInt16(body + i * 4 + 2, true) / 32768;
      }
      return { ...format, signal: { left, right } };
    }
    offset = body + size + (size % 2);
  }
  throw new Error("The WAV file has no data chunk.");
}

interface FormatMeasure {
  readonly stem: "music" | "sfx";
  readonly sampleRate: number;
  readonly channels: number;
  readonly bits: number;
  readonly frames: number;
  readonly expectedFrames: number;
}

interface SectionMeasure {
  readonly music: MusicId;
  readonly seconds: number;
  readonly rmsDb: number;
  readonly peakDb: number;
  readonly chroma: readonly number[];
  readonly overtoneOfD: number;
  readonly bandsDb: readonly number[];
  readonly slopeDb: number;
  readonly mixRmsDb: number;
  readonly speakerRmsDb: number;
  readonly pulse: number;
  readonly motifShare: number;
}

interface JoinMeasure {
  readonly into: MusicId;
  readonly frame: number;
  readonly minDb: number;
  readonly floorBeforeDb: number;
  readonly floorAfterDb: number;
  readonly depthDb: number;
  readonly intended: boolean;
}

interface HitMeasure {
  readonly sfx: SfxId;
  readonly frame: number;
  readonly section: MusicId | null;
  readonly onset: number | null;
  readonly match: number;
  readonly overMusicDb: number;
  readonly presenceDb: number;
}

export interface Report {
  readonly formats: readonly FormatMeasure[];
  readonly sections: readonly SectionMeasure[];
  readonly joins: readonly JoinMeasure[];
  readonly hits: readonly HitMeasure[];
  readonly mix: {
    readonly samplePeakDb: number;
    readonly fullScaleSamples: number;
    readonly meanLeft: number;
    readonly meanRight: number;
    readonly silentEndPeak: number;
    readonly subSideDb: number;
  };
  readonly failures: readonly string[];
}

const SPECTRUM_SIZE = 131_072;
const CHROMA_LOW_HZ = 220;
const CHROMA_HIGH_HZ = 1400;
const FLOOR_BINS = 121;
const DOMINANT_SHARE = 0.05;
const F_SHARP_ABSENT = 0.02;
const F_SHARP_PRESENT = 0.03;
const BAND_EDGES_HZ = [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10_240, 20_480] as const;
const SLOPE_BANDS = [2, 3, 4, 5, 6, 7] as const;
const SLOPE_MIN_DB = 2.5;
const SLOPE_MAX_DB = 4.5;
const SLOPE_SECTIONS: readonly MusicId[] = ["menu", "battle", "build", "resolve"];
const SPEAKER_LOW_HZ = 200;
const SPEAKER_HIGH_HZ = 8000;
const SPEAKER_LIMIT_DB = 8;
const GROOVE_SECTIONS: readonly MusicId[] = ["pulse", "menu", "battle", "proof", "build", "resolve", "report"];
const PULSE_MIN = 0.15;
const MOTIF_SECTIONS: readonly MusicId[] = ["well", "menu", "battle", "resolve", "report", "outro"];
const MOTIF_MIN_SHARE = 0.05;
const MOTIF_WINDOW_CENTS = 35;
const ENVELOPE_SAMPLES = 480;
const JOIN_WINDOW = 0.2 * SAMPLE_RATE;
const JOIN_RMS = 0.05 * SAMPLE_RATE;
const JOIN_HOP = 240;
const JOIN_LIMIT_DB = 3;
const SILENT_START: readonly MusicId[] = ["proof"];
const PRESENCE_LOW_HZ = 1000;
const PRESENCE_HIGH_HZ = 4000;
const STORY_EFFECTS: readonly SfxId[] = [
  "gateSlam",
  "reject",
  "prove",
  "fail",
  "gateOpen",
  "stamp",
  "confirm",
  "slot",
  "type",
  "hit",
  "record",
];
const SUB_HZ = 60;
const SEARCH_BEFORE = 480;
const SEARCH_AFTER = 960;
const TOLERANCE_SAMPLES = 0.002 * SAMPLE_RATE;
const TEMPLATE_SAMPLES = 480;
const MATCH_HIGHPASS_HZ = 1000;
const MATCH_AS_GOOD = 0.98;
const BALANCE_SAMPLES = 0.15 * SAMPLE_RATE;
const SILENT_END_FRAMES = 6;
const PEAK_LIMIT_DB = -1;

const DORIAN: readonly PitchClassName[] = ["D", "E", "F", "G", "A", "B", "C"];
const MAJOR: readonly PitchClassName[] = ["D", "E", "F#", "G", "A", "B", "C#"];
const MAJOR_SECTIONS: readonly MusicId[] = ["resolve", "report", "outro"];
const MOTIF_HZ = { dorian: [440, 349.228, 293.665, 659.255], major: [440, 369.994, 293.665, 659.255] } as const;

const isMajor = (music: MusicId): boolean => MAJOR_SECTIONS.includes(music);

const classIndex = (name: PitchClassName): number => PITCH_CLASS_NAMES.indexOf(name);

const toMono = (signal: Stereo): Float32Array =>
  signal.left.map((value, i) => (value + (signal.right[i] ?? 0)) / 2);

const toSide = (signal: Stereo): Float32Array =>
  signal.left.map((value, i) => (value - (signal.right[i] ?? 0)) / 2);

const slice = (signal: Stereo, start: number, end: number): Stereo => ({
  left: signal.left.subarray(start, end),
  right: signal.right.subarray(start, end),
});

function band(signal: Stereo, low: number, high: number): Stereo {
  const pass = (channel: Float32Array): Float32Array => {
    const stages = [
      { mode: "highpass", cutoff: low },
      { mode: "highpass", cutoff: low },
      { mode: "lowpass", cutoff: high },
      { mode: "lowpass", cutoff: high },
    ] as const;
    return stages.reduce<Float32Array>((current, stage) => svf(current, stage), channel);
  };
  return { left: pass(signal.left), right: pass(signal.right) };
}

function bandPower(power: Float64Array, sampleRate: number, low: number, high: number): number {
  const binHz = sampleRate / (power.length * 2);
  let inside = 0;
  for (let k = Math.max(1, Math.ceil(low / binHz)); k < Math.min(power.length, high / binHz); k++) {
    inside += power[k] ?? 0;
  }
  return inside;
}

function bandDb(power: Float64Array, sampleRate: number, low: number, high: number): number {
  const size = power.length * 2;
  return gainToDb(Math.sqrt((2 * bandPower(power, sampleRate, low, high)) / (size * size * 0.375)));
}

function slopeOf(levels: readonly number[]): number {
  const meanX = (levels.length - 1) / 2;
  const meanY = levels.reduce((a, b) => a + b, 0) / levels.length;
  const cross = levels.reduce((total, level, x) => total + (x - meanX) * (level - meanY), 0);
  const spread = levels.reduce((total, _, x) => total + (x - meanX) ** 2, 0);
  return spread > 0 ? -cross / spread : 0;
}

function repeatStrength(envelope: readonly number[], lag: number): number {
  const rises = envelope.map((value, i) => Math.max(0, value - (envelope[i - 1] ?? value)));
  const mean = rises.reduce((a, b) => a + b, 0) / Math.max(1, rises.length);
  let cross = 0;
  let spread = 0;
  for (let i = 0; i < rises.length; i++) {
    const value = (rises[i] ?? 0) - mean;
    spread += value * value;
    if (i + lag < rises.length) cross += value * ((rises[i + lag] ?? 0) - mean);
  }
  return spread > 0 ? cross / spread : 0;
}

function lowestDb(signal: Stereo, start: number, end: number): number {
  let lowest = Number.POSITIVE_INFINITY;
  for (let at = Math.max(0, start); at + JOIN_RMS <= Math.min(end, signal.left.length); at += JOIN_HOP) {
    lowest = Math.min(lowest, rms(signal, at, at + JOIN_RMS));
  }
  return gainToDb(Number.isFinite(lowest) ? lowest : 0);
}

function detectOnset(mono: Float32Array, expected: number): number | null {
  const change = (i: number): number => Math.abs((mono[i] ?? 0) - (mono[i - 1] ?? 0));
  let before = 0;
  for (let i = expected - 2400; i < expected - SEARCH_BEFORE; i++) before = Math.max(before, change(i));
  const threshold = Math.max(3 * before, 0.0008);
  for (let i = expected - SEARCH_BEFORE; i < expected + SEARCH_AFTER; i++) {
    if (change(i) > threshold) return i - expected;
  }
  return null;
}

const edges = (mono: Float32Array): Float32Array =>
  svf(mono, { mode: "highpass", cutoff: MATCH_HIGHPASS_HZ });

function bestMatch(stem: Float32Array, template: Float32Array, expected: number): number {
  const scores: number[] = [];
  for (let lag = -SEARCH_BEFORE; lag <= SEARCH_AFTER; lag++) {
    let dot = 0;
    let energy = 0;
    for (let i = 0; i < template.length; i++) {
      const value = stem[expected + lag + i] ?? 0;
      dot += (template[i] ?? 0) * value;
      energy += value * value;
    }
    scores.push(energy > 0 ? dot / Math.sqrt(energy) : 0);
  }
  const best = Math.max(...scores);
  return scores.findIndex((score) => score >= best * MATCH_AS_GOOD) - SEARCH_BEFORE;
}

export interface StemFiles {
  readonly music: string;
  readonly sfx: string;
}

interface Stems {
  readonly music: Stereo;
  readonly sfx: Stereo;
  readonly mix: Stereo;
}

function measureSections(view: AudioView, stems: Stems, samplesPerFrame: number): SectionMeasure[] {
  const mono = toMono(stems.music);
  const speaker = band(stems.mix, SPEAKER_LOW_HZ, SPEAKER_HIGH_HZ);
  const speakerMono = toMono(speaker);
  const binHz = SAMPLE_RATE / SPECTRUM_SIZE;
  const grid = { sampleRate: SAMPLE_RATE, low: CHROMA_LOW_HZ, high: CHROMA_HIGH_HZ, floorWidth: FLOOR_BINS };
  return view.sections.map((section) => {
    const start = section.startFrame * samplesPerFrame;
    const end = start + section.beats * view.framesPerBeat * samplesPerFrame;
    const power = powerSpectrum(mono, { start, end, size: SPECTRUM_SIZE, hop: SPECTRUM_SIZE / 8 });
    const classes = noteClassPower(power, grid);
    const total = classes.notes.reduce((a, b) => a + b, 0);
    const share = (value: number): number => (total > 0 ? value / total : 0);
    const bandsDb = BAND_EDGES_HZ.slice(0, -1).map((low, index) =>
      bandDb(power, SAMPLE_RATE, low, BAND_EDGES_HZ[index + 1] ?? SAMPLE_RATE / 2),
    );

    const tonal = tonalPower(
      power,
      FLOOR_BINS,
      Math.floor(SPEAKER_LOW_HZ / binHz),
      Math.ceil(SPEAKER_HIGH_HZ / binHz),
    );
    const tonalIn = (low: number, high: number): number => bandPower(tonal, SAMPLE_RATE, low, high);
    const width = 2 ** (MOTIF_WINDOW_CENTS / 1200);
    const motif = MOTIF_HZ[isMajor(section.music) ? "major" : "dorian"]
      .map((hz) => tonalIn(hz / width, hz * width))
      .reduce((a, b) => a + b, 0);
    const inBand = tonalIn(SPEAKER_LOW_HZ, SPEAKER_HIGH_HZ);

    const envelope: number[] = [];
    for (let at = start; at + ENVELOPE_SAMPLES <= end; at += ENVELOPE_SAMPLES) {
      let energy = 0;
      for (let i = at; i < at + ENVELOPE_SAMPLES; i++) energy += (speakerMono[i] ?? 0) ** 2;
      envelope.push(Math.sqrt(energy / ENVELOPE_SAMPLES));
    }
    const beat = (view.framesPerBeat * samplesPerFrame) / ENVELOPE_SAMPLES;

    return {
      music: section.music,
      seconds: (end - start) / SAMPLE_RATE,
      rmsDb: gainToDb(rms(stems.music, start, end)),
      peakDb: gainToDb(peak(slice(stems.music, start, end))),
      chroma: classes.notes.map(share),
      overtoneOfD: share(classes.overtones[classIndex("F#")] ?? 0),
      bandsDb,
      slopeDb: slopeOf(SLOPE_BANDS.map((index) => bandsDb[index] ?? 0)),
      mixRmsDb: gainToDb(rms(stems.mix, start, end)),
      speakerRmsDb: gainToDb(rms(speaker, start, end)),
      pulse: Math.max(
        repeatStrength(envelope, Math.round(beat / 2)),
        repeatStrength(envelope, Math.round(beat)),
      ),
      motifShare: inBand > 0 ? motif / inBand : 0,
    };
  });
}

function measureJoins(view: AudioView, music: Stereo, samplesPerFrame: number): JoinMeasure[] {
  return view.sections.slice(1).map((section) => {
    const at = section.startFrame * samplesPerFrame;
    const minDb = lowestDb(music, at - JOIN_WINDOW, at + JOIN_WINDOW);
    const floorBeforeDb = lowestDb(music, at - JOIN_WINDOW - SAMPLE_RATE, at - JOIN_WINDOW);
    const floorAfterDb = lowestDb(music, at + JOIN_WINDOW, at + JOIN_WINDOW + SAMPLE_RATE);
    return {
      into: section.music,
      frame: section.startFrame,
      minDb,
      floorBeforeDb,
      floorAfterDb,
      depthDb: Math.min(floorBeforeDb, floorAfterDb) - minDb,
      intended: SILENT_START.includes(section.music),
    };
  });
}

function measureHits(view: AudioView, stems: Stems, samplesPerFrame: number): HitMeasure[] {
  const mono = toMono(stems.sfx);
  const stemEdges = edges(mono);
  const sfxPresence = band(stems.sfx, PRESENCE_LOW_HZ, PRESENCE_HIGH_HZ);
  const musicPresence = band(stems.music, PRESENCE_LOW_HZ, PRESENCE_HIGH_HZ);
  const over = (effect: Stereo, music: Stereo, start: number, length: number): number =>
    gainToDb(rms(effect, start, start + length)) - gainToDb(rms(music, start, start + length));
  return scheduledVoices(view).map((voice) => {
    const expected = voice.frame * samplesPerFrame;
    const sound = toMono(SFX[voice.sfx](voice.context));
    const sounding = Math.min(0.25 * SAMPLE_RATE, Math.max(0.04 * SAMPLE_RATE, sound.length));
    const section = view.sections.filter((span) => span.startFrame <= voice.frame).at(-1);
    return {
      sfx: voice.sfx,
      frame: voice.frame,
      section: section?.music ?? null,
      onset: detectOnset(mono, expected),
      match: bestMatch(stemEdges, edges(sound).subarray(0, TEMPLATE_SAMPLES), expected),
      overMusicDb: over(stems.sfx, stems.music, expected, BALANCE_SAMPLES),
      presenceDb: over(sfxPresence, musicPresence, expected, sounding),
    };
  });
}

const median = (values: readonly number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? Number.NaN;

interface SectionPresence {
  readonly section: MusicId | null;
  readonly medianDb: number;
}

function worstSection(hits: readonly HitMeasure[], id: SfxId): SectionPresence | null {
  const own = hits.filter((hit) => hit.sfx === id);
  const sections = [...new Set(own.map((hit) => hit.section))];
  const medians = sections.map((section) => ({
    section,
    medianDb: median(own.filter((hit) => hit.section === section).map((hit) => hit.presenceDb)),
  }));
  return medians.reduce<SectionPresence | null>(
    (worst, next) => (worst === null || next.medianDb < worst.medianDb ? next : worst),
    null,
  );
}

function findFailures(report: Omit<Report, "failures">): string[] {
  const failures: string[] = [];
  const fail = (condition: boolean, message: string): void => {
    if (!condition) failures.push(message);
  };
  for (const format of report.formats) {
    fail(
      format.frames === format.expectedFrames && format.sampleRate === SAMPLE_RATE,
      `${format.stem}.wav is not ${format.expectedFrames} samples at ${SAMPLE_RATE} Hz.`,
    );
  }
  fail(report.mix.samplePeakDb <= PEAK_LIMIT_DB, `The mix peaks above ${PEAK_LIMIT_DB} dBFS.`);
  fail(report.mix.fullScaleSamples === 0, "The mix has samples at full scale.");
  fail(Math.abs(report.mix.meanLeft) < 1e-4 && Math.abs(report.mix.meanRight) < 1e-4, "The mix has an offset.");
  fail(report.mix.silentEndPeak === 0, `The last ${SILENT_END_FRAMES} frames are not silent.`);

  const level = (music: MusicId): number[] =>
    report.sections.filter((section) => section.music === music).map((section) => section.rmsDb);
  const loudest = Math.max(...report.sections.map((section) => section.rmsDb));
  const quietest = Math.min(...report.sections.map((section) => section.rmsDb));
  fail(level("resolve").includes(loudest), "`resolve` is not the loudest section.");
  fail(level("well").includes(quietest), "`well` is not the quietest section.");
  const calm: readonly MusicId[] = ["well", "pulse", "menu", "proof", "report", "outro"];
  const calmTop = Math.max(...report.sections.filter((s) => calm.includes(s.music)).map((s) => s.rmsDb));
  fail(level("battle").every((db) => db > calmTop), "`battle` is not louder than the calm sections.");

  for (const section of report.sections) {
    const name = `\`${section.music}\``;
    const key = isMajor(section.music) ? MAJOR : DORIAN;
    const outside = PITCH_CLASS_NAMES.filter(
      (pitch) => (section.chroma[classIndex(pitch)] ?? 0) >= DOMINANT_SHARE && !key.includes(pitch),
    );
    fail(outside.length === 0, `${name} has a dominant pitch class outside its key: ${outside.join(" ")}.`);
    const fSharp = section.chroma[classIndex("F#")] ?? 0;
    fail(
      isMajor(section.music) ? fSharp >= F_SHARP_PRESENT : fSharp < F_SHARP_ABSENT,
      `${name} has ${(fSharp * 100).toFixed(1)}% of its note power on F sharp.`,
    );
    const lost = section.mixRmsDb - section.speakerRmsDb;
    fail(lost <= SPEAKER_LIMIT_DB, `${name} loses ${lost.toFixed(1)} dB on a small speaker.`);
    if (SLOPE_SECTIONS.includes(section.music)) {
      fail(
        section.slopeDb >= SLOPE_MIN_DB && section.slopeDb <= SLOPE_MAX_DB,
        `${name} falls ${section.slopeDb.toFixed(1)} dB for each octave.`,
      );
    }
    if (GROOVE_SECTIONS.includes(section.music)) {
      fail(section.pulse >= PULSE_MIN, `${name} has no pulse in the small-speaker band.`);
    }
    if (MOTIF_SECTIONS.includes(section.music)) {
      fail(section.motifShare >= MOTIF_MIN_SHARE, `${name} has no motif in the small-speaker band.`);
    }
  }

  for (const join of report.joins) {
    fail(
      join.intended || join.depthDb <= JOIN_LIMIT_DB,
      `The join into \`${join.into}\` dips ${join.depthDb.toFixed(1)} dB.`,
    );
  }

  for (const id of STORY_EFFECTS) {
    const worst = worstSection(report.hits, id);
    fail(
      worst === null || worst.medianDb >= 0,
      `\`${id}\` in \`${worst?.section ?? "-"}\` is ${(-(worst?.medianDb ?? 0)).toFixed(1)} dB ` +
        "under the music from 1 to 4 kHz.",
    );
  }

  const late = report.hits.filter((hit) => Math.abs(hit.match) > TOLERANCE_SAMPLES);
  fail(late.length === 0, `${late.length} effects are not at their frame.`);
  const heard = report.hits.filter((hit) => hit.onset !== null && Math.abs(hit.onset) <= TOLERANCE_SAMPLES);
  const spread = new Set(heard.map((hit) => hit.section));
  fail(heard.length >= 10 && spread.size >= 5, "Fewer than ten onsets in five sections are within 2 ms.");
  return failures;
}

export function measure(view: AudioView, files: StemFiles): Report {
  const wavs = { music: parseWav(readFileSync(files.music)), sfx: parseWav(readFileSync(files.sfx)) };
  const music = wavs.music.signal;
  const sfx = wavs.sfx.signal;
  const samplesPerFrame = SAMPLE_RATE / view.fps;
  const expectedFrames = view.durationFrames * samplesPerFrame;
  const formats = (["music", "sfx"] as const).map((stem) => ({
    stem,
    sampleRate: wavs[stem].sampleRate,
    channels: wavs[stem].channels,
    bits: wavs[stem].bits,
    frames: wavs[stem].signal.left.length,
    expectedFrames,
  }));

  const length = Math.min(music.left.length, sfx.left.length);
  const mix = {
    left: music.left.map((value, i) => value + (sfx.left[i] ?? 0)),
    right: music.right.map((value, i) => value + (sfx.right[i] ?? 0)),
  };
  const stems = { music, sfx, mix };
  const silentFrom = length - SILENT_END_FRAMES * samplesPerFrame;
  let top = 0;
  let fullScale = 0;
  let meanLeft = 0;
  let meanRight = 0;
  let silentEndPeak = 0;
  for (let i = 0; i < length; i++) {
    const level = Math.max(Math.abs(mix.left[i] ?? 0), Math.abs(mix.right[i] ?? 0));
    top = Math.max(top, level);
    if (level >= 32767 / 32768) fullScale += 1;
    meanLeft += (mix.left[i] ?? 0) / length;
    meanRight += (mix.right[i] ?? 0) / length;
    if (i >= silentFrom) silentEndPeak = Math.max(silentEndPeak, level);
  }
  const whole = { start: 0, end: length, size: 16_384, hop: 8192 };
  const sub = (signal: Float32Array): number =>
    bandPower(powerSpectrum(signal, whole), SAMPLE_RATE, 0, SUB_HZ);

  const measured = {
    formats,
    sections: measureSections(view, stems, samplesPerFrame),
    joins: measureJoins(view, music, samplesPerFrame),
    hits: measureHits(view, stems, samplesPerFrame),
    mix: {
      samplePeakDb: gainToDb(top),
      fullScaleSamples: fullScale,
      meanLeft,
      meanRight,
      silentEndPeak,
      subSideDb: 10 * Math.log10((sub(toSide(mix)) + 1e-30) / (sub(toMono(mix)) + 1e-30)),
    },
  };
  return { ...measured, failures: findFailures(measured) };
}

const percent = (share: number): string => `${(share * 100).toFixed(1)}%`;

const cell = (value: number, width: number, digits = 1): string => value.toFixed(digits).padStart(width);

export function formatReport(report: Report): string {
  const lines: string[] = ["", "FORMAT"];
  for (const format of report.formats) {
    lines.push(
      `  ${format.stem}: ${format.sampleRate} Hz, ${format.channels} channels, ${format.bits} bit, ` +
        `${format.frames} samples (expected ${format.expectedFrames})`,
    );
  }

  const { mix } = report;
  lines.push(
    "",
    "MIX (music + sfx)",
    `  sample peak ${mix.samplePeakDb.toFixed(2)} dBFS, samples at full scale ${mix.fullScaleSamples}`,
    `  mean (DC) left ${mix.meanLeft.toExponential(2)}, right ${mix.meanRight.toExponential(2)}`,
    `  last ${SILENT_END_FRAMES} frames: largest sample ${mix.silentEndPeak}`,
    `  below ${SUB_HZ} Hz the channel difference is ${mix.subSideDb.toFixed(1)} dB against the channel sum`,
  );

  lines.push("", "MUSIC STEM BY SECTION", "  section   seconds  RMS dBFS  peak dBFS");
  for (const section of report.sections) {
    lines.push(
      `  ${section.music.padEnd(8)}  ${cell(section.seconds, 6)}  ${cell(section.rmsDb, 8)}  ` +
        `${cell(section.peakDb, 9)}`,
    );
  }

  lines.push(
    "",
    "OCTAVE BANDS OF THE MUSIC STEM (RMS dBFS, band starts at the Hz in the heading)",
    "  slope: dB that the bands from 80 Hz to 5 kHz fall for each octave, from a least-squares line",
    `  section   ${BAND_EDGES_HZ.slice(0, -1).map((edge) => String(edge).padStart(6)).join("")}   slope`,
  );
  for (const section of report.sections) {
    lines.push(
      `  ${section.music.padEnd(8)}  ${section.bandsDb.map((db) => cell(db, 6, 0)).join("")}  ` +
        `${cell(section.slopeDb, 6)}`,
    );
  }

  lines.push(
    "",
    `SMALL SPEAKER (music + sfx through ${SPEAKER_LOW_HZ} Hz to ${SPEAKER_HIGH_HZ} Hz, limit ${SPEAKER_LIMIT_DB} dB)`,
    "  pulse: how strongly the rises of the level in that band repeat at the eighth note or the beat, 0 to 1",
    "  motif: share of the tonal power in that band on A4, F4 or F#4, D4, E5",
    "  section   full RMS  band RMS    lost   pulse   motif",
  );
  for (const section of report.sections) {
    lines.push(
      `  ${section.music.padEnd(8)}  ${cell(section.mixRmsDb, 8)}  ${cell(section.speakerRmsDb, 8)}  ` +
        `${cell(section.mixRmsDb - section.speakerRmsDb, 6)}  ${cell(section.pulse, 6, 2)}  ` +
        `${percent(section.motifShare).padStart(6)}`,
    );
  }

  lines.push(
    "",
    "SECTION JOINS (music stem, lowest 50 ms RMS in dBFS)",
    "  at the join: within 200 ms of it. before, after: in the second on each side of that window.",
    "  dip: dB that the join is below the quieter side. 0 or less is no dip.",
    "  into      frame  at the join   before    after     dip",
  );
  for (const join of report.joins) {
    lines.push(
      `  ${join.into.padEnd(8)}  ${String(join.frame).padStart(5)}  ${cell(join.minDb, 11)}  ` +
        `${cell(join.floorBeforeDb, 7)}  ${cell(join.floorAfterDb, 7)}  ${cell(join.depthDb, 6)}` +
        (join.intended ? "  silence that the film asks for" : ""),
    );
  }

  lines.push(
    "",
    "PITCH CLASSES OF THE MUSIC STEM (note power from " +
      `${CHROMA_LOW_HZ} to ${CHROMA_HIGH_HZ} Hz, % of total; fifth harmonics are split off)`,
    `  section   ${PITCH_CLASS_NAMES.map((name) => name.padStart(5)).join("")}   ` +
      `dominant (>= ${percent(DOMINANT_SHARE)})  outside key`,
  );
  for (const section of report.sections) {
    const key = isMajor(section.music) ? MAJOR : DORIAN;
    const dominant = PITCH_CLASS_NAMES.filter(
      (name) => (section.chroma[classIndex(name)] ?? 0) >= DOMINANT_SHARE,
    );
    const outside = dominant.filter((name) => !key.includes(name));
    lines.push(
      `  ${section.music.padEnd(8)}  ${section.chroma.map((share) => cell(share * 100, 5)).join("")}   ` +
        `${dominant.join(" ").padEnd(16)}  ${outside.length === 0 ? "none" : outside.join(" ")}`,
    );
  }
  lines.push(
    "",
    "  F, F sharp, and the fifth harmonic of D (14 cents below F sharp: an overtone, not a note)",
    "  section   F        F#       overtone of D",
  );
  for (const section of report.sections) {
    const share = (name: PitchClassName): string => percent(section.chroma[classIndex(name)] ?? 0).padStart(6);
    lines.push(
      `  ${section.music.padEnd(8)}  ${share("F")}   ${share("F#")}   ${percent(section.overtoneOfD).padStart(6)}`,
    );
  }

  const ids = [...new Set(report.hits.map((hit) => hit.sfx))];
  lines.push(
    "",
    "EFFECT LEVEL OVER THE MUSIC (dB)",
    "  all: the whole band, first 150 ms. 1-4 kHz: that band, while the effect sounds, up to 250 ms.",
    "  * carries a story beat: in each section where it sounds, its median from 1 to 4 kHz must be 0 or more.",
    "  worst section: the section where that median is lowest.",
    "  effect      hits  all median  1-4 kHz min  1-4 kHz median  worst section",
  );
  for (const id of ids) {
    const hits = report.hits.filter((hit) => hit.sfx === id);
    const presence = hits.map((hit) => hit.presenceDb);
    const worst = worstSection(report.hits, id);
    lines.push(
      `  ${(id + (STORY_EFFECTS.includes(id) ? " *" : "")).padEnd(11)} ${String(hits.length).padStart(4)}  ` +
        `${cell(median(hits.map((hit) => hit.overMusicDb)), 10)}  ${cell(Math.min(...presence), 11)}  ` +
        `${cell(median(presence), 14)}  ${cell(worst?.medianDb ?? Number.NaN, 6)} ${worst?.section ?? "-"}`,
    );
  }

  const onTime = report.hits.filter((hit) => Math.abs(hit.match) <= TOLERANCE_SAMPLES);
  const heard = report.hits.filter((hit) => hit.onset !== null && Math.abs(hit.onset) <= TOLERANCE_SAMPLES);
  const ms = (samples: number): string => `${((samples / SAMPLE_RATE) * 1000).toFixed(3)} ms`;
  lines.push(
    "",
    `EFFECT POSITIONS IN THE SFX STEM (search from ${SEARCH_BEFORE} samples before ` +
      `to ${SEARCH_AFTER} after the frame start)`,
    `  match: where the stem has the shape of the first 10 ms of the effect. ` +
      `${onTime.length} of ${report.hits.length} within 2 ms.`,
    `  onset: first jump in the stem. ${heard.length} of ${report.hits.length} within 2 ms.`,
    "  frame  section   effect     match                onset",
  );
  for (const hit of report.hits) {
    const onset =
      hit.onset === null
        ? "not found: an earlier sound is still loud"
        : `${String(hit.onset).padStart(4)} samples ${ms(hit.onset)}`;
    lines.push(
      `  ${String(hit.frame).padStart(5)}  ${(hit.section ?? "-").padEnd(8)}  ${hit.sfx.padEnd(9)}  ` +
        `${String(hit.match).padStart(3)} samples ${ms(hit.match)}  ${onset}`,
    );
  }

  lines.push("", "CHECKS");
  if (report.failures.length === 0) lines.push("  All acceptance checks of this report hold.");
  for (const failure of report.failures) lines.push(`  FAIL: ${failure}`);
  lines.push("");
  return lines.join("\n");
}
