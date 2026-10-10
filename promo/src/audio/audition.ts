import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encodeWav, gainToDb, mixdown, peak, rms, SAMPLE_RATE, type Stereo, toSamples } from "./dsp";
import { fixtureAudioView } from "./fixture";
import { DORIAN_TONIC } from "./harmony";
import { SFX_IDS, type SfxId } from "./ids";
import { renderAudio, scheduledVoices } from "./score";
import { SFX, type VoiceContext } from "./sfx";

const GAP_SECONDS = 1.5;
const MIN_SECONDS = 0.02;
const MAX_SECONDS = 4;
const SILENT_DB = -60;
const END_DB = -30;

const view = fixtureAudioView();
const scheduled = scheduledVoices(view);

function contextOf(id: SfxId): VoiceContext {
  const first = scheduled.find((voice) => voice.sfx === id);
  return (
    first?.context ?? {
      ordinal: 0,
      count: 1,
      chord: DORIAN_TONIC,
      seed: 1,
      sixteenth: view.framesPerBeat / view.fps / 4,
      span: 0,
    }
  );
}

const peakOf = (signal: Stereo, start: number, end: number): number =>
  peak({ left: signal.left.subarray(start, end), right: signal.right.subarray(start, end) });

const rendered = SFX_IDS.map((id) => {
  const signal = SFX[id](contextOf(id));
  const length = signal.left.length;
  const seconds = length / SAMPLE_RATE;
  const measures = {
    seconds,
    peakDb: gainToDb(peak(signal)),
    rmsDb: gainToDb(rms(signal)),
    startDb: gainToDb(peakOf(signal, 0, toSamples(0.002))),
    endDb: gainToDb(peakOf(signal, length - toSamples(0.001), length)),
    lastSample: Math.max(Math.abs(signal.left[length - 1] ?? 0), Math.abs(signal.right[length - 1] ?? 0)),
  };
  const ok =
    seconds >= MIN_SECONDS &&
    seconds <= MAX_SECONDS &&
    measures.rmsDb > SILENT_DB &&
    measures.endDb < END_DB &&
    measures.lastSample < 1e-4;
  return { id, signal, measures, ok, used: scheduled.some((voice) => voice.sfx === id) };
});

const gap = toSamples(GAP_SECONDS);
const auditionLength = (SFX_IDS.length - 1) * gap + toSamples(MAX_SECONDS);
const audition = mixdown(
  auditionLength,
  rendered.map((effect, index) => ({ at: index * gap, signal: effect.signal })),
);

const { music, sfx } = renderAudio(view);
const mix = mixdown(music.left.length, [
  { at: 0, signal: music },
  { at: 0, signal: sfx },
]);

const outDir = path.join(import.meta.dirname, "..", "..", "out", "audio");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "sfx-audition.wav"), encodeWav(audition, { ditherSeed: 3 }));
writeFileSync(path.join(outDir, "mix.wav"), encodeWav(mix, { ditherSeed: 4 }));

const lines = [
  "effect      at s    ms   peak dBFS  RMS dBFS  first 2 ms  last 1 ms  last sample  in film  check",
  ...rendered.map(({ id, measures, ok, used }, index) =>
    [
      id.padEnd(9),
      (index * GAP_SECONDS).toFixed(1).padStart(6),
      (measures.seconds * 1000).toFixed(0).padStart(5),
      measures.peakDb.toFixed(1).padStart(10),
      measures.rmsDb.toFixed(1).padStart(9),
      measures.startDb.toFixed(1).padStart(11),
      measures.endDb.toFixed(1).padStart(10),
      measures.lastSample.toExponential(1).padStart(12),
      (used ? "yes" : "no").padStart(8),
      ok ? " OK" : " FAIL",
    ].join(" "),
  ),
  `wrote ${path.relative(process.cwd(), path.join(outDir, "sfx-audition.wav"))} and mix.wav`,
  "",
];
process.stdout.write(lines.join("\n"));

if (rendered.some((effect) => !effect.ok)) {
  process.stderr.write("An effect is silent, too short, too long, or ends with a click.\n");
  process.exitCode = 1;
}
