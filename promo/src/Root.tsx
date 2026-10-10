import "./fonts";
import type { FC } from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { Film, type FilmProps } from "./Film";
import { TIMELINE } from "./film";
import { AUDIO_FILES, parseAudioManifest, STALE_AUDIO_MESSAGE, type AudioManifest } from "./timeline";
import { VIDEO } from "./video";

const readManifest = async (signal: AbortSignal): Promise<AudioManifest | null> => {
  try {
    const response = await fetch(staticFile(AUDIO_FILES.manifest), { signal, cache: "no-store" });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return parseAudioManifest(body);
  } catch {
    return null;
  }
};

const guardAudio: CalculateMetadataFunction<FilmProps> = async ({ props, abortSignal }) => {
  if (typeof props.audio !== "boolean") throw new Error('The input prop "audio" must be true or false.');
  if (props.audio && (await readManifest(abortSignal))?.audioHash !== TIMELINE.audioHash) {
    throw new Error(STALE_AUDIO_MESSAGE);
  }
  return {};
};

export const Root: FC = () => (
  <Composition
    id="MakoPromo"
    component={Film}
    durationInFrames={TIMELINE.durationFrames}
    fps={TIMELINE.tempo.fps}
    width={VIDEO.width}
    height={VIDEO.height}
    defaultProps={{ audio: true }}
    calculateMetadata={guardAudio}
  />
);
