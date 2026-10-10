import type { FC, ReactNode } from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TIMELINE } from "./film";
import { Cover, Frame, stepped } from "./kit";
import { SCENES } from "./scenes";
import type { SceneKind } from "./scenes/contracts";
import { THEMES } from "./theme";
import { AUDIO_FILES, type Exit, type SceneOf } from "./timeline";
import type { SceneFC } from "./useSceneClock";

export type FilmProps = {
  readonly audio: boolean;
};

const VOICEOVER_MUSIC_GAIN = 0.35;

const renderScene = <K extends SceneKind>(scene: SceneOf<K>): ReactNode => {
  const Scene: SceneFC<K> = SCENES[scene.kind];
  return <Scene scene={scene} />;
};

const ExitCover: FC<{ readonly exit: Extract<Exit, { readonly kind: "cover" }> }> = ({ exit }) => {
  const frame = useCurrentFrame();
  return <Cover color={exit.color} from={exit.from} progress={stepped(frame, exit.frames)} />;
};

const SHOTS = TIMELINE.scenes.flatMap((scene) => scene.shots);

const musicVolume = (frame: number): number =>
  SHOTS.some((shot) => shot.vo !== null && frame >= shot.startFrame && frame < shot.startFrame + shot.durationFrames)
    ? VOICEOVER_MUSIC_GAIN
    : 1;

const Soundtrack: FC = () => (
  <>
    <Html5Audio src={staticFile(AUDIO_FILES.music)} volume={musicVolume} />
    <Html5Audio src={staticFile(AUDIO_FILES.sfx)} />
    {SHOTS.map((shot) =>
      shot.vo === null ? null : (
        <Sequence key={shot.startFrame} from={shot.startFrame} durationInFrames={shot.durationFrames} layout="none">
          <Html5Audio src={staticFile(shot.vo)} />
        </Sequence>
      ),
    )}
  </>
);

export const Film: FC<FilmProps> = ({ audio }) => (
  <AbsoluteFill style={{ backgroundColor: THEMES.dark.chrome }}>
    {TIMELINE.scenes.map((scene) => (
      <Sequence key={scene.index} name={scene.kind} from={scene.startFrame} durationInFrames={scene.durationFrames}>
        <Frame theme={scene.theme}>{renderScene(scene)}</Frame>
      </Sequence>
    ))}
    {TIMELINE.scenes.map((scene) =>
      scene.exit.kind === "cover" ? (
        <Sequence
          key={scene.index}
          name={`${scene.kind} exit`}
          from={scene.startFrame + scene.durationFrames - scene.exit.frames}
          durationInFrames={scene.exit.frames}
        >
          <ExitCover exit={scene.exit} />
        </Sequence>
      ) : null,
    )}
    {audio ? <Soundtrack /> : null}
  </AbsoluteFill>
);
