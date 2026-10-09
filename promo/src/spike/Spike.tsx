import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Html5Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FlowField } from "./FlowField";
import { ENERGY_PALETTE, toCss } from "./palette";
import { SPIKE } from "./spec";

const INK = {
  background: toCss(ENERGY_PALETTE[0]),
  label: toCss(ENERGY_PALETTE[4]),
  heading: toCss(ENERGY_PALETTE[5]),
} as const;

export const Spike: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const virtualWidth = width / SPIKE.pixelScale;
  const virtualHeight = height / SPIKE.pixelScale;

  return (
    <AbsoluteFill style={{ backgroundColor: INK.background }}>
      {/* The canvas holds one texel per virtual pixel and the browser upscales
          it unfiltered. dpr is pinned so --scale cannot change the texel count. */}
      <ThreeCanvas
        width={virtualWidth}
        height={virtualHeight}
        dpr={1}
        gl={{ antialias: false }}
        style={{
          transform: `scale(${SPIKE.pixelScale})`,
          transformOrigin: "0 0",
          imageRendering: "pixelated",
        }}
      >
        <FlowField width={virtualWidth} height={virtualHeight} />
      </ThreeCanvas>
      <AbsoluteFill style={{ padding: 96, gap: 24 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "sans-serif",
            fontSize: 120,
            fontWeight: 700,
            lineHeight: 1,
            color: INK.heading,
          }}
        >
          Render pipeline spike
        </h1>
        <p
          style={{
            margin: 0,
            padding: "10px 14px",
            alignSelf: "flex-start",
            fontFamily: "monospace",
            fontSize: 32,
            lineHeight: 1,
            color: INK.label,
            backgroundColor: INK.background,
          }}
        >
          webgl + dom + audio / {width}x{height} / {fps} fps / frame{" "}
          {String(frame).padStart(3, "0")} of {durationInFrames}
        </p>
      </AbsoluteFill>
      <Html5Audio src={staticFile(SPIKE.audioFile)} />
    </AbsoluteFill>
  );
};
