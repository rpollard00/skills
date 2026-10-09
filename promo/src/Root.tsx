import { Composition } from "remotion";
import { Spike } from "./spike/Spike";
import { SPIKE } from "./spike/spec";
import { VIDEO } from "./video";

export const Root: React.FC = () => (
  <Composition
    id={SPIKE.id}
    component={Spike}
    durationInFrames={SPIKE.durationInSeconds * VIDEO.fps}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
  />
);
