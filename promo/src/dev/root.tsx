import "../fonts";
import type { FC } from "react";
import { Composition } from "remotion";
import { TIMELINE } from "../film";
import { Frame } from "../kit/grid";
import type { SceneKind } from "../scenes/contracts";
import { sceneOf } from "../timeline";
import type { SceneFC } from "../useSceneClock";
import { VIDEO } from "../video";

export const sceneRoot = <K extends SceneKind>(kind: K, Component: SceneFC<K>): FC => {
  const scene = sceneOf(TIMELINE, kind);
  const Only: FC = () => (
    <Frame theme={scene.theme}>
      <Component scene={scene} />
    </Frame>
  );
  return () => (
    <Composition
      id="Scene"
      component={Only}
      durationInFrames={scene.durationFrames}
      fps={scene.tempo.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
