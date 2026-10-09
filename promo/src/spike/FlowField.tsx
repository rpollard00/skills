import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { GLSL3, Vector2, Vector3, type IUniform } from "three";
import { flowFragmentShader, flowVertexShader } from "./flowShader";
import { ENERGY_PALETTE } from "./palette";

type FlowUniforms = {
  readonly uTime: IUniform<number>;
  readonly uResolution: IUniform<Vector2>;
  readonly uPalette: IUniform<readonly Vector3[]>;
};

type FlowFieldProps = {
  readonly width: number;
  readonly height: number;
};

const DEFINES = { PALETTE_SIZE: ENERGY_PALETTE.length } as const;

const PALETTE_VECTORS: readonly Vector3[] = ENERGY_PALETTE.map(
  ([red, green, blue]) => new Vector3(red / 255, green / 255, blue / 255),
);

export const FlowField: React.FC<FlowFieldProps> = ({ width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // R3F copies these into the material's own uniforms whenever the prop
  // changes identity. Mutating an object passed earlier reaches nothing, so
  // every frame gets a new one.
  const uniforms = useMemo<FlowUniforms>(
    () => ({
      uTime: { value: frame / fps },
      uResolution: { value: new Vector2(width, height) },
      uPalette: { value: PALETTE_VECTORS },
    }),
    [frame, fps, width, height],
  );

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <rawShaderMaterial
        glslVersion={GLSL3}
        defines={DEFINES}
        vertexShader={flowVertexShader}
        fragmentShader={flowFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};
