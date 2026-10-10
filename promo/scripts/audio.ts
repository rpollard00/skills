import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { formatReport, measure } from "../src/audio/analyze";
import { encodeWav, gainToDb, mixdown, peak, truePeak } from "../src/audio/dsp";
import { renderAudio } from "../src/audio/score";
import { TIMELINE } from "../src/film/index";
import { AUDIO_FILES, type AudioManifest, type AudioView, audioView } from "../src/timeline";

const view: AudioView = audioView(TIMELINE);

const publicDir = path.join(import.meta.dirname, "..", "public");
const files = {
  music: path.join(publicDir, AUDIO_FILES.music),
  sfx: path.join(publicDir, AUDIO_FILES.sfx),
  manifest: path.join(publicDir, AUDIO_FILES.manifest),
};

const deleteManifestFirstWriteItLast = <Stems>(writeStems: () => Stems): Stems => {
  rmSync(files.manifest, { force: true });
  const stems = writeStems();
  const manifest: AudioManifest = { audioHash: view.audioHash };
  writeFileSync(files.manifest, `${JSON.stringify(manifest)}\n`);
  return stems;
};

mkdirSync(path.dirname(files.manifest), { recursive: true });
const { music, sfx } = deleteManifestFirstWriteItLast(() => {
  const stems = renderAudio(view);
  writeFileSync(files.music, encodeWav(stems.music, { ditherSeed: 1 }));
  writeFileSync(files.sfx, encodeWav(stems.sfx, { ditherSeed: 2 }));
  return stems;
});

const together = mixdown(music.left.length, [
  { at: 0, signal: music },
  { at: 0, signal: sfx },
]);
const written = [files.music, files.sfx, files.manifest].map((file) => path.relative(process.cwd(), file));
process.stdout.write(
  [
    `sections ${view.sections.length}, hits ${view.hits.length}, ${music.left.length} samples for each stem`,
    `peak of music + sfx: ${gainToDb(peak(together)).toFixed(2)} dBFS sample, ` +
      `${gainToDb(truePeak(together)).toFixed(2)} dBFS true`,
    `audioHash ${view.audioHash}`,
    `wrote ${written.join(", ")}`,
    "",
  ].join("\n"),
);

if (process.argv.includes("--verify")) {
  const report = measure(view, files);
  process.stdout.write(formatReport(report));
  if (report.failures.length > 0) process.exitCode = 1;
}
