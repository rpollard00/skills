// The composition is as long as the film: Remotion clamps a frozen frame to the
// length of its composition.

import "../fonts";
import type { FC } from "react";
import { Composition, Freeze, registerRoot, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { Film } from "../Film";
import { TIMELINE } from "../film";
import { VIDEO } from "../video";

type StillsProps = { readonly frames: readonly number[] };

const isFilmFrame = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < TIMELINE.durationFrames;

const Stills: FC<StillsProps> = ({ frames }) => {
  const index = useCurrentFrame();
  return (
    <Freeze frame={frames[index] ?? 0}>
      <Film audio={false} />
    </Freeze>
  );
};

const checkFrames: CalculateMetadataFunction<StillsProps> = ({ props }) => {
  const frames: unknown = props.frames;
  if (!Array.isArray(frames) || frames.length === 0 || !frames.every(isFilmFrame)) {
    throw new Error(`The input prop "frames" must be a list of film frames from 0 to ${TIMELINE.durationFrames - 1}.`);
  }
  return {};
};

registerRoot(() => (
  <Composition
    id="Stills"
    component={Stills}
    durationInFrames={TIMELINE.durationFrames}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
    defaultProps={{ frames: [0] }}
    calculateMetadata={checkFrames}
  />
));
