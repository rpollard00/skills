import {
  adsr,
  decay,
  fade,
  fm,
  glide,
  mulberry32,
  osc,
  type Param,
  pluck,
  SAMPLE_RATE,
  saturate,
  scale,
  settle,
  type Stereo,
  sum,
  svf,
  swell,
  toSamples,
  toStereo,
  whiteNoise,
} from "./dsp";

const cents = (amount: number): number => 2 ** (amount / 1200);

function wideNoise(length: number, seed: number): Stereo {
  const a = whiteNoise(length, seed);
  const b = whiteNoise(length, seed + 7919);
  return { left: sum(scale(a, 0.8), scale(b, 0.35)), right: sum(scale(b, 0.8), scale(a, 0.35)) };
}

export type KickKind = "hard" | "soft" | "sub";

interface KickSpec {
  readonly seconds: number;
  readonly from: number;
  readonly to: number;
  readonly tau: number;
  readonly t60: number;
  readonly drive: number;
  readonly knock: number;
  readonly click: number;
}

const KICKS: Readonly<Record<KickKind, KickSpec>> = {
  hard: { seconds: 0.34, from: 210, to: 55, tau: 0.034, t60: 0.3, drive: 1.9, knock: 0.5, click: 0.8 },
  soft: { seconds: 0.3, from: 125, to: 55, tau: 0.04, t60: 0.26, drive: 1.3, knock: 0.4, click: 0.4 },
  sub: { seconds: 0.45, from: 110, to: 73.42, tau: 0.05, t60: 0.4, drive: 2.2, knock: 0.6, click: 0.25 },
};

export function kick(kind: KickKind): Stereo {
  const spec = KICKS[kind];
  const length = toSamples(spec.seconds);
  const body = scale(
    osc({ shape: "sine", length, freq: settle({ length, from: spec.from, to: spec.to, tau: spec.tau }) }),
    decay(length, spec.t60),
  );
  const knockLength = toSamples(0.09);
  const knock = scale(
    osc({ shape: "sine", length: knockLength, freq: settle({ length: knockLength, from: 420, to: 190, tau: 0.02 }) }),
    scale(decay(knockLength, 0.07), spec.knock),
  );
  const clickLength = toSamples(0.014);
  const click = scale(
    sum(
      svf(whiteNoise(clickLength, 11), { mode: "highpass", cutoff: 1800 }),
      scale(osc({ shape: "sine", length: clickLength, freq: 2600 }), 0.6),
    ),
    scale(decay(clickLength, 0.012), spec.click),
  );
  return toStereo(fade(sum(saturate(sum(body, knock), spec.drive), click), { out: 0.012 }));
}

export type SnareKind = "full" | "snap" | "ghost";

interface SnareSpec {
  readonly seconds: number;
  readonly body: number;
  readonly bodyT60: number;
  readonly band: number;
  readonly noiseT60: number;
  readonly crack: number;
}

const SNARES: Readonly<Record<SnareKind, SnareSpec>> = {
  full: { seconds: 0.3, body: 0.6, bodyT60: 0.13, band: 2400, noiseT60: 0.22, crack: 0.8 },
  snap: { seconds: 0.16, body: 0.25, bodyT60: 0.07, band: 2900, noiseT60: 0.1, crack: 0.8 },
  ghost: { seconds: 0.12, body: 0.2, bodyT60: 0.06, band: 2600, noiseT60: 0.07, crack: 0.25 },
};

export function snare(kind: SnareKind, seed: number): Stereo {
  const spec = SNARES[kind];
  const length = toSamples(spec.seconds);
  const body = scale(
    osc({ shape: "sine", length, freq: settle({ length, from: 290, to: 196, tau: 0.012 }) }),
    scale(decay(length, spec.bodyT60), spec.body),
  );
  const noise = wideNoise(length, seed);
  const rattle = (channel: Float32Array): Float32Array => {
    const band = svf(channel, { mode: "bandpass", cutoff: spec.band, q: 0.5 });
    const air = svf(channel, { mode: "highpass", cutoff: 5200 });
    const crack = scale(air, scale(decay(length, 0.014), spec.crack));
    const mixed = sum(scale(sum(band, scale(air, 0.6)), decay(length, spec.noiseT60)), crack, body);
    return fade(saturate(mixed, 1.4), { out: 0.01 });
  };
  return { left: rattle(noise.left), right: rattle(noise.right) };
}

export function tom(hz: number, seed: number): Stereo {
  const length = toSamples(0.26);
  const body = scale(
    osc({ shape: "sine", length, freq: settle({ length, from: hz * 1.7, to: hz, tau: 0.03 }) }),
    decay(length, 0.24),
  );
  const skin = scale(
    svf(whiteNoise(length, seed), { mode: "bandpass", cutoff: hz * 6, q: 0.8 }),
    scale(decay(length, 0.04), 0.9),
  );
  return toStereo(fade(saturate(sum(body, skin), 1.6), { out: 0.01 }));
}

const HAT_PARTIALS = [821, 1218, 1478, 2091, 2160, 3200] as const;

function metal(length: number): Float32Array {
  return scale(
    sum(...HAT_PARTIALS.map((freq, i) => osc({ shape: "pulse", length, freq, phase: i * 0.137 }))),
    1 / HAT_PARTIALS.length,
  );
}

export function hat(open: boolean, seed: number): Stereo {
  const length = toSamples(open ? 0.3 : 0.07);
  const envelope = decay(length, open ? 0.32 : 0.05);
  const ring = metal(length);
  const noise = wideNoise(length, seed);
  const voice = (channel: Float32Array): Float32Array => {
    const bright = svf(sum(scale(channel, 0.7), scale(ring, 0.9)), { mode: "highpass", cutoff: 6500, q: 0.9 });
    return fade(scale(bright, envelope), { out: 0.004 });
  };
  return { left: voice(noise.left), right: voice(noise.right) };
}

export function shaker(seed: number): Stereo {
  const length = toSamples(0.07);
  const noise = wideNoise(length, seed);
  const voice = (channel: Float32Array): Float32Array =>
    fade(scale(svf(channel, { mode: "bandpass", cutoff: 7500, q: 0.7 }), decay(length, 0.07)), {
      in: 0.012,
      out: 0.01,
    });
  return { left: voice(noise.left), right: voice(noise.right) };
}

export function crash(seed: number): Stereo {
  const length = toSamples(2.4);
  const envelope = decay(length, 2.0);
  const ring = metal(length);
  const noise = wideNoise(length, seed);
  const voice = (channel: Float32Array): Float32Array => {
    const bright = svf(sum(channel, scale(ring, 0.6)), { mode: "highpass", cutoff: 3800, q: 0.7 });
    return fade(scale(bright, envelope), { in: 0.002, out: 0.2 });
  };
  return { left: voice(noise.left), right: voice(noise.right) };
}

export interface BassArgs {
  readonly hz: number;
  readonly gate: number;
  readonly bright: number;
  readonly accent: boolean;
}

export function bassNote(args: BassArgs): Stereo {
  const release = 0.05;
  const length = toSamples(args.gate + release);
  const raw = sum(
    scale(osc({ shape: "sine", length, freq: args.hz }), 0.55),
    scale(osc({ shape: "triangle", length, freq: args.hz, phase: 0.25 }), 0.5),
    scale(osc({ shape: "saw", length, freq: args.hz, phase: 0.5 }), 0.6),
    scale(osc({ shape: "pulse", length, freq: args.hz * 2, width: 0.3 }), 0.3),
  );
  const floor = args.hz * 3.5 + 150;
  const cutoff = settle({
    length,
    from: floor + args.bright * (args.accent ? 3200 : 2300),
    to: floor + args.bright * 700,
    tau: 0.08,
  });
  const shaped = scale(
    svf(raw, { mode: "lowpass", cutoff, q: 1 }),
    adsr({ attack: 0.004, decay: 0.18, sustain: 0.7, release, gate: args.gate }),
  );
  return toStereo(scale(saturate(shaped, 2), args.accent ? 1 : 0.82));
}

export interface PadArgs {
  readonly hz: number;
  readonly gate: number;
  readonly attack: number;
  readonly release: number;
  readonly cutoff: Param;
  readonly voices: number;
  readonly detune: number;
  readonly seed: number;
}

export function padNote(args: PadArgs): Stereo {
  const length = toSamples(args.gate + args.release);
  const next = mulberry32(args.seed);
  const voices = Math.max(1, Math.round(args.voices));
  const layers = Array.from({ length: voices }, (_, voice) => {
    const spread = voices === 1 ? 0 : (voice / (voices - 1)) * 2 - 1;
    const freq = args.hz * cents((spread * args.detune) / 2 + (next() - 0.5) * 2);
    const mirror = voices - 1 - voice;
    const sign = voice === mirror ? 0 : (Math.min(voice, mirror) % 2 === 0 ? -1 : 1) * (voice < mirror ? 1 : -1);
    const side = sign * (0.35 + 0.6 * Math.abs(spread));
    const angle = ((side + 1) * Math.PI) / 4;
    return { saw: osc({ shape: "saw", length, freq, phase: next() }), left: Math.cos(angle), right: Math.sin(angle) };
  });
  const envelope = scale(
    swell({ attack: args.attack, release: args.release, gate: args.gate }),
    1 / Math.sqrt(voices),
  );
  const voice = (side: "left" | "right"): Float32Array => {
    const raw = sum(...layers.map((layer) => scale(layer.saw, layer[side])));
    const once = svf(raw, { mode: "lowpass", cutoff: args.cutoff, q: 0.6 });
    return scale(svf(once, { mode: "lowpass", cutoff: args.cutoff, q: 0.8 }), envelope);
  };
  return { left: voice("left"), right: voice("right") };
}

export interface ToneArgs {
  readonly hz: number;
  readonly gate: number;
  readonly attack: number;
  readonly release: number;
}

export function sineTone(args: ToneArgs): Stereo {
  const length = toSamples(args.gate + args.release);
  return toStereo(
    scale(
      osc({ shape: "sine", length, freq: args.hz }),
      swell({ attack: args.attack, release: args.release, gate: args.gate }),
    ),
  );
}

export interface LeadArgs {
  readonly hz: number;
  readonly gate: number;
  readonly bright: number;
}

export function leadNote(args: LeadArgs): Stereo {
  const release = 0.09;
  const length = toSamples(args.gate + release);
  const vibrato = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const depth = 9 * Math.min(1, Math.max(0, (t - 0.16) / 0.25));
    vibrato[i] = args.hz * cents(depth * Math.sin(2 * Math.PI * 5.6 * t));
  }
  const a = osc({ shape: "pulse", length, freq: vibrato, width: 0.25 });
  const b = osc({ shape: "pulse", length, freq: scale(vibrato, cents(7)), width: 0.27, phase: 0.31 });
  const cutoff = settle({
    length,
    from: 1600 + args.bright * 6500,
    to: 1200 + args.bright * 3600,
    tau: 0.12,
  });
  const envelope = adsr({ attack: 0.005, decay: 0.12, sustain: 0.72, release, gate: args.gate });
  const voice = (near: Float32Array, far: Float32Array): Float32Array =>
    scale(svf(sum(scale(near, 0.72), scale(far, 0.38)), { mode: "lowpass", cutoff, q: 0.9 }), envelope);
  return { left: voice(a, b), right: voice(b, a) };
}

export interface PluckNoteArgs {
  readonly hz: number;
  readonly seconds: number;
  readonly bright: number;
  readonly seed: number;
}

export function pluckNote(args: PluckNoteArgs): Stereo {
  const length = toSamples(args.seconds);
  const string = (detune: number, seed: number): Float32Array =>
    pluck({
      freq: args.hz * cents(detune),
      length,
      seed,
      brightness: args.bright,
      t60: Math.min(4, 1.2 + 500 / args.hz),
    });
  const a = string(-1.5, args.seed);
  const b = string(1.5, args.seed + 101);
  const voice = (near: Float32Array, far: Float32Array): Float32Array =>
    fade(sum(scale(near, 0.75), scale(far, 0.35)), { out: Math.min(0.08, args.seconds / 2) });
  return { left: voice(a, b), right: voice(b, a) };
}

export interface KeyArgs {
  readonly hz: number;
  readonly bright: number;
  readonly t60: number;
}

export function keyNote(args: KeyArgs): Stereo {
  const length = toSamples(args.t60);
  const raw = sum(
    scale(osc({ shape: "saw", length, freq: args.hz, phase: 0.5 }), 0.6),
    scale(osc({ shape: "pulse", length, freq: args.hz * cents(5), width: 0.4 }), 0.4),
  );
  const cutoff = settle({ length, from: 700 + args.bright * 6500, to: 500 + args.bright * 900, tau: 0.05 });
  const shaped = scale(svf(raw, { mode: "lowpass", cutoff, q: 1.3 }), decay(length, args.t60));
  return toStereo(fade(shaped, { in: 0.001, out: 0.01 }));
}

export interface BellArgs {
  readonly hz: number;
  readonly t60: number;
  readonly ratio: number;
  readonly index: number;
}

export function bellNote(args: BellArgs): Stereo {
  const length = toSamples(args.t60);
  const index = scale(decay(length, args.t60 * 0.45), args.index);
  const envelope = decay(length, args.t60);
  const voice = (detune: number): Float32Array =>
    fade(scale(fm({ length, carrier: args.hz * cents(detune), ratio: args.ratio, index }), envelope), {
      in: 0.001,
      out: 0.02,
    });
  return { left: voice(-3), right: voice(3) };
}

export interface SweepArgs {
  readonly seconds: number;
  readonly from: number;
  readonly to: number;
  readonly q: number;
  readonly seed: number;
}

export function noiseSweep(args: SweepArgs): Stereo {
  const length = toSamples(args.seconds);
  const cutoff = glide({ length, from: args.from, to: args.to, seconds: args.seconds, curve: "exp" });
  const noise = wideNoise(length, args.seed);
  const band = (channel: Float32Array): Float32Array =>
    svf(channel, { mode: "bandpass", cutoff, q: args.q });
  return { left: band(noise.left), right: band(noise.right) };
}
