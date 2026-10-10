import { useMemo, type FC } from "react";
import { DoubleSide, FrontSide, GLSL3, Matrix4, PerspectiveCamera, Vector2, Vector3, Vector4, type IUniform } from "three";
import { rgb, type Hex } from "../theme";
import { GLSL_BAYER8, GLSL_HASH, GLSL_NOISE, GLSL_RAMP } from "./glsl";
import { useStage } from "./PixelStage";

export type UniformValue = number | Vector2 | Vector3 | Vector4 | Matrix4 | readonly number[] | readonly Vector3[];

const PRECISION = `
precision highp float;
precision highp int;
`;

const RAMP_MAIN = `
out vec4 outColor;

void main() {
  float t = 0.0;
  float a = 1.0;
  shade(t, a);
  ivec2 cell = stageCell();
  if (a <= bayer8(cell)) discard;
  outColor = vec4(rampPick(t, cell), 1.0);
}
`;

export interface RampMaterialProps {
  /** Palette stops, dark to light, from `theme.ts`. Two or more. */
  readonly ramp: readonly Hex[];
  /** A full GLSL ES 3.00 vertex shader, without the `#version` line. Declare `in vec3 position;`. */
  readonly vertex: string;
  /**
   * GLSL that declares its uniforms and varyings and defines
   * `void shade(out float t, out float a)`. `t` in [0, 1] is the position on
   * the ramp. `a` in [0, 1] is the coverage. The shared chunk then writes one
   * flat palette color, or discards by ordered dither. `bayer8`, `stageCell`,
   * `hash`, `valueNoise`, and `fbm` are in scope.
   */
  readonly fragment: string;
  /** Values for this frame. Pass plain values; a new uniforms object is made on each render. */
  readonly uniforms?: Readonly<Record<string, UniformValue>>;
  readonly doubleSided?: boolean;
}

/**
 * The one material for every mesh on a PixelStage. A color outside `ramp`
 * cannot reach the canvas, and a blended pixel cannot exist.
 */
export const RampMaterial: FC<RampMaterialProps> = ({ ramp, vertex, fragment, uniforms = {}, doubleSided = false }) => {
  const stage = useStage();
  const rampKey = ramp.join();
  const stops = useMemo(
    () =>
      ramp.map((hex) => {
        const [red, green, blue] = rgb(hex);
        return new Vector3(red / 255, green / 255, blue / 255);
      }),
    [rampKey],
  );
  const source = useMemo(
    () => ({
      vertexShader: `${PRECISION}${vertex}`,
      fragmentShader: `${PRECISION}${GLSL_BAYER8}${GLSL_HASH}${GLSL_NOISE}${GLSL_RAMP}${fragment}${RAMP_MAIN}`,
      defines: { RAMP_SIZE: stops.length },
    }),
    [vertex, fragment, stops.length],
  );

  // React Three Fiber copies the uniforms into the material when this prop
  // changes identity. A mutated object reaches nothing, so each render makes a new one.
  const frameUniforms: Record<string, IUniform<UniformValue>> = {
    uRamp: { value: stops },
    uStage: { value: new Vector4(stage.x, stage.y, stage.cols, stage.rows) },
  };
  for (const [name, value] of Object.entries(uniforms)) frameUniforms[name] = { value };

  return (
    <rawShaderMaterial
      glslVersion={GLSL3}
      vertexShader={source.vertexShader}
      fragmentShader={source.fragmentShader}
      defines={source.defines}
      uniforms={frameUniforms}
      side={doubleSided ? DoubleSide : FrontSide}
    />
  );
};

export type Vec3 = readonly [x: number, y: number, z: number];

export const mixVec = (from: Vec3, to: Vec3, t: number): Vec3 => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

export interface StageCamera {
  /** Projection times view. Multiply a world position by it in the vertex shader. */
  readonly viewProjection: Matrix4;
  /** The camera's right and up directions in the world, for camera-facing strips. */
  readonly right: Vector3;
  readonly up: Vector3;
}

export const stageCamera = (args: {
  /** Vertical field of view in degrees. */
  readonly fov: number;
  /** Stage columns divided by stage rows. */
  readonly aspect: number;
  readonly position: Vec3;
  readonly target: Vec3;
  /** Default 500. */
  readonly far?: number;
}): StageCamera => {
  const camera = new PerspectiveCamera(args.fov, args.aspect, 0.1, args.far ?? 500);
  camera.position.set(...args.position);
  camera.lookAt(...args.target);
  camera.updateMatrixWorld();
  return {
    viewProjection: new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    right: new Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
    up: new Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
  };
};
