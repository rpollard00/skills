import {
  type Clip,
  echo,
  fade,
  gainStereo,
  mapStereo,
  mixdown,
  type SAMPLE_RATE,
  scale,
  type Stereo,
  toSamples,
} from "./dsp";
import type { Chord } from "./harmony";

export interface Tempo {
  readonly fps: number;
  readonly framesPerBeat: number;
  readonly beatsPerBar: number;
}

export interface SectionContext {
  readonly beats: number;
  readonly tempo: Tempo;
  readonly sampleRate: typeof SAMPLE_RATE;
}

export interface SectionAudio {
  readonly dry: Stereo;
  readonly send: Stereo;
  readonly harmony: readonly Chord[];
}

export type SectionEnd = "ring" | "cut";

interface PartSpec {
  readonly fader: number;
  readonly ducked: boolean;
}

const PARTS = {
  kick: { fader: 0.78, ducked: false },
  snare: { fader: 1.12, ducked: false },
  tom: { fader: 0.9, ducked: false },
  hat: { fader: 2.8, ducked: false },
  shaker: { fader: 1.6, ducked: false },
  cymbal: { fader: 1.8, ducked: false },
  bass: { fader: 0.76, ducked: true },
  pad: { fader: 0.95, ducked: true },
  stab: { fader: 0.8, ducked: false },
  lead: { fader: 1.05, ducked: false },
  key: { fader: 1.1, ducked: false },
  pluck: { fader: 1.4, ducked: false },
  bell: { fader: 1.3, ducked: false },
  air: { fader: 2, ducked: false },
} as const satisfies Record<string, PartSpec>;

type Part = keyof typeof PARTS;

type Bus = Record<"direct" | "ducked", Clip[]>;

export interface Level {
  readonly gain: number;
  readonly send: number;
  readonly echo?: number;
}

const SIXTEENTHS_PER_BEAT = 4;
const ECHO_SIXTEENTHS = 3;
const TAIL_SIXTEENTHS = 8;
const TAIL_FADE_SECONDS = 0.1;
const CUT_FADE_SECONDS = 0.004;
const DUCK_ATTACK_SECONDS = 0.002;
const DUCK_RELEASE_SECONDS = 0.09;

export interface Arrangement {
  readonly sixteenths: number;
  readonly samples: number;
  readonly bars: number;
  readonly bar: number;
  seconds(sixteenths: number): number;
  sampleAt(sixteenth: number): number;
  gate(start: number, length: number, release: number): number;
  ring(start: number, limit: number): number;
  add(part: Part, signal: Stereo, sixteenth: number, level: Level): void;
  duck(sixteenth: number, depth: number): void;
  render(chordAt: (sixteenth: number) => Chord, level: number): SectionAudio;
}

export function arrange(ctx: SectionContext, end: SectionEnd = "ring"): Arrangement {
  const perSixteenth =
    ((ctx.sampleRate / ctx.tempo.fps) * ctx.tempo.framesPerBeat) / SIXTEENTHS_PER_BEAT;
  const sixteenths = ctx.beats * SIXTEENTHS_PER_BEAT;
  const samples = Math.round(sixteenths * perSixteenth);
  const bar = ctx.tempo.beatsPerBar * SIXTEENTHS_PER_BEAT;
  const seconds = (count: number): number => (count * perSixteenth) / ctx.sampleRate;
  const sampleAt = (sixteenth: number): number => Math.round(sixteenth * perSixteenth);
  const tail = end === "ring" ? TAIL_SIXTEENTHS : 0;
  const rendered = samples + sampleAt(tail);

  const dry: Bus = { direct: [], ducked: [] };
  const send: Bus = { direct: [], ducked: [] };
  const echoes: Clip[] = [];
  const ducks: { readonly at: number; readonly depth: number }[] = [];

  const duckCurve = (): Float32Array => {
    const curve = new Float32Array(rendered).fill(1);
    const span = toSamples(DUCK_RELEASE_SECONDS * 5);
    for (const dip of ducks) {
      for (let i = 0; i < span && dip.at + i < rendered; i++) {
        const t = i / ctx.sampleRate;
        const shape = (1 - Math.exp(-t / DUCK_ATTACK_SECONDS)) * Math.exp(-t / DUCK_RELEASE_SECONDS);
        curve[dip.at + i] = (curve[dip.at + i] ?? 1) * (1 - dip.depth * shape);
      }
    }
    return curve;
  };

  return {
    sixteenths,
    samples,
    bars: Math.ceil(sixteenths / bar),
    bar,
    seconds,
    sampleAt,
    gate: (start, length, release) => {
      const room = seconds(sixteenths - start) - (end === "cut" ? release : 0);
      return Math.max(0.01, Math.min(seconds(length), room));
    },
    ring: (start, limit) => Math.min(limit, seconds(sixteenths + tail - start)),
    add: (part, signal, sixteenth, level) => {
      const gain = level.gain * PARTS[part].fader;
      if (sixteenth < 0 || sixteenth >= sixteenths || gain <= 0) return;
      const clip = { at: sampleAt(sixteenth), signal };
      const bus = PARTS[part].ducked ? "ducked" : "direct";
      dry[bus].push({ ...clip, gain });
      if (level.send > 0) send[bus].push({ ...clip, gain: gain * level.send });
      if (level.echo !== undefined && level.echo > 0) {
        echoes.push({ ...clip, gain: gain * level.echo });
      }
    },
    duck: (sixteenth, depth) => {
      if (sixteenth >= 0 && sixteenth < sixteenths) ducks.push({ at: sampleAt(sixteenth), depth });
    },
    render: (chordAt, level) => {
      const curve = duckCurve();
      const repeats = echo(mixdown(rendered, echoes), {
        seconds: seconds(ECHO_SIXTEENTHS),
        feedback: 0.4,
        damping: 4500,
        tail: 0,
      });
      const out = end === "ring" ? TAIL_FADE_SECONDS : CUT_FADE_SECONDS;
      const bus = (clips: Bus, echoShare: number): Stereo => {
        const mixed = mixdown(rendered, [
          { at: 0, signal: mixdown(rendered, clips.direct) },
          { at: 0, signal: gainStereo(mixdown(rendered, clips.ducked), curve) },
          { at: 0, signal: repeats, gain: echoShare },
        ]);
        return mapStereo(mixed, (channel) => scale(fade(channel, { out }), level));
      };
      return {
        dry: bus(dry, 1),
        send: bus(send, 0.35),
        harmony: Array.from({ length: Math.ceil(ctx.beats) }, (_, beat) =>
          chordAt(beat * SIXTEENTHS_PER_BEAT),
        ),
      };
    },
  };
}
