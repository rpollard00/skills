import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SPIKE } from "../src/spike/spec";

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;

// Interleaved left/right samples in [-1, 1].
type StereoSamples = Float32Array;

type PadSpec = {
  readonly durationInSeconds: number;
  readonly frequenciesHz: readonly number[];
  readonly attackSeconds: number;
  readonly releaseSeconds: number;
  readonly peak: number;
};

const smoothstep = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const renderPad = (spec: PadSpec): StereoSamples => {
  const frameCount = Math.round(spec.durationInSeconds * SAMPLE_RATE);
  const samples = new Float32Array(frameCount * CHANNELS);
  const detune = [0.997, 1.003] as const;

  for (let frame = 0; frame < frameCount; frame++) {
    const t = frame / SAMPLE_RATE;
    const envelope =
      smoothstep(t / spec.attackSeconds) *
      smoothstep((spec.durationInSeconds - t) / spec.releaseSeconds);
    const swell = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.4 * t);

    detune.forEach((ratio, channel) => {
      let sum = 0;
      for (const frequency of spec.frequenciesHz) {
        sum += Math.sin(2 * Math.PI * frequency * ratio * t);
      }
      samples[frame * CHANNELS + channel] =
        (sum / spec.frequenciesHz.length) * envelope * swell * spec.peak;
    });
  }

  return samples;
};

const encodeWav = (samples: StereoSamples): Buffer => {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE;
  const wav = Buffer.alloc(WAV_HEADER_BYTES + dataBytes);

  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(WAV_HEADER_BYTES - 8 + dataBytes, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(CHANNELS, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * blockAlign, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataBytes, 40);

  samples.forEach((sample, index) => {
    const clamped = Math.min(1, Math.max(-1, sample));
    wav.writeInt16LE(
      Math.round(clamped * 32767),
      WAV_HEADER_BYTES + index * BYTES_PER_SAMPLE,
    );
  });

  return wav;
};

const publicDir = path.join(import.meta.dirname, "..", "public");

const writeWav = (relativePath: string, samples: StereoSamples): void => {
  const outputPath = path.join(publicDir, relativePath);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeWav(samples));
  process.stdout.write(
    `${path.relative(process.cwd(), outputPath)}: ${samples.length / CHANNELS} frames at ${SAMPLE_RATE} Hz\n`,
  );
};

writeWav(
  SPIKE.audioFile,
  renderPad({
    durationInSeconds: SPIKE.durationInSeconds,
    // A2, E3, A3, C#4
    frequenciesHz: [110, 164.81, 220, 277.18],
    attackSeconds: 0.6,
    releaseSeconds: 1.2,
    peak: 0.5,
  }),
);
