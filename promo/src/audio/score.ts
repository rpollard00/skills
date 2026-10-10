import type { AudioView } from "../timeline";
import type { SectionAudio } from "./arrangement";
import {
  dbToGain,
  dcBlock,
  gainStereo,
  hash32,
  integratedLoudness,
  limiterGain,
  lowShelf,
  mapStereo,
  mixdown,
  monoBelow,
  reverb,
  SAMPLE_RATE,
  type Stereo,
  svf,
  toSamples,
  truePeak,
} from "./dsp";
import { type Chord, DORIAN_TONIC } from "./harmony";
import type { SfxId } from "./ids";
import { SECTIONS } from "./sections";
import { SFX, type VoiceContext } from "./sfx";

export interface AudioRender {
  readonly music: Stereo;
  readonly sfx: Stereo;
}

type Hit = AudioView["hits"][number];
type SectionSpan = AudioView["sections"][number];

const RUN_GAP_BEATS = 3;
const SILENT_END_FRAMES = 6;
const END_FADE_SECONDS = 1.2;
const FILM_LUFS = -16;
const LIMITER_LOSS_LU = 0.4;
const TARGET_LUFS = FILM_LUFS + LIMITER_LOSS_LU;
const LIMITER_CEILING_DB = -1.5;
const FILM_PEAK_LIMIT_DB = -1;
const TRUE_PEAK_MARGIN_DB = 0.1;
const MAX_TRUE_PEAK_DB = FILM_PEAK_LIMIT_DB - TRUE_PEAK_MARGIN_DB;
const REVERB_RETURN = 0.9;
const REVERB_SEND_LOW_HZ = 220;
const MONO_BELOW_HZ = 130;
const SUBSONIC_HZ = 30;
const LOW_SHELF_HZ = 70;
const LOW_SHELF_DB = -3;
const TOP_HZ = 17_000;

const MUSIC_DUCK_DB: Readonly<Partial<Record<SfxId, number>>> = {
  gateSlam: 3,
  gateOpen: 3,
  stamp: 3,
  reject: 2,
  prove: 2,
  fail: 2,
  hit: 3,
  record: 3,
  type: 2,
};
const DUCK_ATTACK_SECONDS = 0.012;
const DUCK_HOLD_SECONDS = 0.15;
const DUCK_RELEASE_SECONDS = 0.35;

interface RunPosition {
  readonly ordinal: number;
  readonly count: number;
}

function runPositions(hits: readonly Hit[], gapFrames: number): RunPosition[] {
  const open = new Map<SfxId, number[]>();
  const runs: number[][] = [];
  hits.forEach((hit, index) => {
    const run = open.get(hit.sfx);
    const previous = run === undefined ? undefined : hits[run[run.length - 1] ?? -1];
    const sameCue =
      previous !== undefined && hit.count === previous.count && hit.ordinal === previous.ordinal + 1;
    if (run !== undefined && previous !== undefined && (sameCue || hit.frame - previous.frame <= gapFrames)) {
      run.push(index);
      return;
    }
    const started = [index];
    open.set(hit.sfx, started);
    runs.push(started);
  });
  const positions = hits.map((): RunPosition => ({ ordinal: 0, count: 1 }));
  for (const run of runs) {
    run.forEach((index, ordinal) => {
      positions[index] = { ordinal, count: run.length };
    });
  }
  return positions;
}

interface Placed {
  readonly span: SectionSpan;
  readonly audio: SectionAudio;
}

function samplesPerFrameOf(view: AudioView): number {
  const samplesPerFrame = SAMPLE_RATE / view.fps;
  if (!Number.isInteger(samplesPerFrame)) {
    throw new Error(`${view.fps} fps does not divide ${SAMPLE_RATE} Hz into whole samples.`);
  }
  return samplesPerFrame;
}

const placeSections = (view: AudioView): Placed[] =>
  view.sections.map((span) => ({
    span,
    audio: SECTIONS[span.music]({
      beats: span.beats,
      tempo: { fps: view.fps, framesPerBeat: view.framesPerBeat, beatsPerBar: view.beatsPerBar },
      sampleRate: SAMPLE_RATE,
    }),
  }));

function chordAt(placed: readonly Placed[], frame: number, framesPerBeat: number): Chord {
  const inside = placed.filter((section) => section.span.startFrame <= frame).at(-1);
  if (inside === undefined) return DORIAN_TONIC;
  const beat = Math.floor((frame - inside.span.startFrame) / framesPerBeat);
  return inside.audio.harmony[beat] ?? inside.audio.harmony.at(-1) ?? DORIAN_TONIC;
}

export interface ScheduledVoice {
  readonly sfx: SfxId;
  readonly frame: number;
  readonly context: VoiceContext;
}

function schedule(view: AudioView, placed: readonly Placed[]): ScheduledVoice[] {
  const hits = [...view.hits].sort((a, b) => a.frame - b.frame);
  const positions = runPositions(hits, RUN_GAP_BEATS * view.framesPerBeat);
  return hits.map((hit, index) => ({
    sfx: hit.sfx,
    frame: hit.frame,
    context: {
      ordinal: positions[index]?.ordinal ?? 0,
      count: positions[index]?.count ?? 1,
      chord: chordAt(placed, hit.frame, view.framesPerBeat),
      seed: hash32(`${hit.sfx}:${index}`),
      sixteenth: view.framesPerBeat / view.fps / 4,
      span: hit.spanFrames / view.fps,
    },
  }));
}

export const scheduledVoices = (view: AudioView): ScheduledVoice[] =>
  schedule(view, placeSections(view));

function endEnvelope(length: number, silentSamples: number): Float32Array {
  const fadeSamples = toSamples(END_FADE_SECONDS);
  const silentFrom = length - silentSamples;
  const envelope = new Float32Array(length).fill(1);
  for (let i = Math.max(0, silentFrom - fadeSamples); i < length; i++) {
    const x = (silentFrom - i) / fadeSamples;
    envelope[i] = i >= silentFrom ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * x);
  }
  return envelope;
}

const bandLimit = (channel: Float32Array): Float32Array => {
  const once = svf(channel, { mode: "highpass", cutoff: SUBSONIC_HZ });
  const shelved = lowShelf(svf(once, { mode: "highpass", cutoff: SUBSONIC_HZ }), LOW_SHELF_HZ, LOW_SHELF_DB);
  return svf(shelved, { mode: "lowpass", cutoff: TOP_HZ });
};

function musicDuck(length: number, voices: readonly ScheduledVoice[], samplesPerFrame: number): Float32Array {
  const gain = new Float32Array(length).fill(1);
  const attack = toSamples(DUCK_ATTACK_SECONDS);
  const hold = toSamples(DUCK_HOLD_SECONDS);
  const release = toSamples(DUCK_RELEASE_SECONDS);
  for (const voice of voices) {
    const depth = 1 - dbToGain(-(MUSIC_DUCK_DB[voice.sfx] ?? 0));
    if (depth <= 0) continue;
    const start = voice.frame * samplesPerFrame;
    for (let i = -attack; i < hold + release; i++) {
      const index = start + i;
      if (index < 0 || index >= length) continue;
      const shape =
        i < 0 ? 1 + i / attack : i < hold ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - hold)) / release);
      gain[index] = Math.min(gain[index] ?? 1, 1 - depth * shape);
    }
  }
  return gain;
}

const addStereo = (length: number, a: Stereo, b: Stereo, gain = 1): Stereo =>
  mixdown(length, [
    { at: 0, signal: a },
    { at: 0, signal: b, gain },
  ]);

export function renderAudio(view: AudioView): AudioRender {
  const samplesPerFrame = samplesPerFrameOf(view);
  const length = view.durationFrames * samplesPerFrame;
  const placed = placeSections(view);

  const place = (pick: (audio: SectionAudio) => Stereo): Stereo =>
    mixdown(
      length,
      placed.map(({ span, audio }) => ({ at: span.startFrame * samplesPerFrame, signal: pick(audio) })),
    );
  const send = mapStereo(
    place((audio) => audio.send),
    (channel) => svf(channel, { mode: "highpass", cutoff: REVERB_SEND_LOW_HZ }),
  );
  const wet = reverb(send, { t60: 2.3, damping: 5500, size: 1, predelay: 0.02, tail: 0 });
  const voices = schedule(view, placed);
  const mixed = addStereo(length, place((audio) => audio.dry), wet, REVERB_RETURN);
  const musicBus = gainStereo(
    mapStereo(monoBelow(mixed, MONO_BELOW_HZ), bandLimit),
    musicDuck(length, voices, samplesPerFrame),
  );

  const effects = mixdown(
    length,
    voices.map((voice) => ({ at: voice.frame * samplesPerFrame, signal: SFX[voice.sfx](voice.context) })),
  );
  const sfxBus = mapStereo(monoBelow(effects, MONO_BELOW_HZ), bandLimit);

  const unscaled = addStereo(length, musicBus, sfxBus);
  const drive = dbToGain(TARGET_LUFS - integratedLoudness(unscaled));
  const together = gainStereo(unscaled, drive);
  const ceiling = dbToGain(LIMITER_CEILING_DB);
  const limit = limiterGain(together, { ceiling, knee: 0.6, lookahead: 0.005, release: 0.12 });
  const envelope = endEnvelope(length, SILENT_END_FRAMES * samplesPerFrame);
  const shaped = (stem: Stereo): Stereo =>
    gainStereo(mapStereo(gainStereo(stem, limit), dcBlock), envelope);
  const music = shaped(gainStereo(musicBus, drive));
  const sfx = shaped(gainStereo(sfxBus, drive));

  const top = truePeak(addStereo(length, music, sfx));
  const trim = Math.min(1, dbToGain(MAX_TRUE_PEAK_DB) / Math.max(top, 1e-9));
  return { music: gainStereo(music, trim), sfx: gainStereo(sfx, trim) };
}
