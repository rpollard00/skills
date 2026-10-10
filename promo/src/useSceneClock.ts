import type { FC } from "react";
import { useCurrentFrame } from "remotion";
import type { SceneKind } from "./scenes/contracts";
import { sceneClockAt, type SceneClock, type SceneOf } from "./timeline";

export type { CuePath, CueState, CurrentCard, LabelPath, SceneClock, SceneOf, ShotId } from "./timeline";

/** A scene component. `Film.tsx` renders it inside a `Frame` of the scene's theme, in a `Sequence` of the scene's length. */
export type SceneFC<K extends SceneKind> = FC<{ readonly scene: SceneOf<K> }>;

export const useSceneClock = <K extends SceneKind>(scene: SceneOf<K>): SceneClock<K> =>
  sceneClockAt(scene, useCurrentFrame());
