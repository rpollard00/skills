import { useMemo, type FC } from "react";
import { InstancedBufferAttribute, InstancedBufferGeometry, BufferAttribute } from "three";
import { mulberry32 } from "../kit/motion";
import { ENERGY, type Hex } from "../theme";
import { strip } from "./geometry";
import { RampMaterial, type StageCamera } from "./ramp";

const SEGMENTS = 64;

const VERTEX = `
in vec3 position;
in vec4 aRibbon;
in float aPhase;

uniform mat4 uViewProjection;
uniform vec3 uRight;
uniform float uTime;
uniform float uHeight;
uniform float uWidth;

out float vAlong;
out float vHeight;
out float vSpeed;
out float vPhase;

void main() {
  float h = (position.y - 0.5) * uHeight;
  float theta = aRibbon.x + aRibbon.w * h + aRibbon.z * uTime;
  float rho = aRibbon.y * (1.0 + 0.25 * sin(0.4 * h + aPhase + 1.3 * uTime));
  float halfWidth = 0.5 * uWidth * (1.0 - position.y);
  vec3 world = vec3(rho * cos(theta), h, rho * sin(theta)) + uRight * (position.x * 2.0 - 1.0) * halfWidth;
  vAlong = position.y;
  vHeight = h;
  vSpeed = aRibbon.z;
  vPhase = aPhase;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

const FRAGMENT = `
uniform float uTime;

in float vAlong;
in float vHeight;
in float vSpeed;
in float vPhase;

void shade(out float t, out float a) {
  t = fract(0.08 * vHeight - 2.0 * vSpeed * uTime + vPhase);
  a = 1.0 - vAlong * vAlong;
}
`;

const RAMP: readonly Hex[] = [ENERGY[1], ENERGY[2], ENERGY[3], ENERGY[4]];

export interface RibbonsProps {
  readonly count: number;
  /** Least and greatest distance from the vertical axis, in world units. */
  readonly radius: readonly [min: number, max: number];
  /** World units from the bottom of a ribbon to its top. The ribbons center on y = 0. */
  readonly height: number;
  readonly seed: number;
  /** Seconds. Take it from the film frame. */
  readonly time: number;
  readonly camera: StageCamera;
  /** World units across a ribbon at its bottom. It narrows to 0 at the top. Default 0.36. */
  readonly width?: number;
}

/**
 * Energy ribbons that turn about the vertical axis. Bright bands move up each
 * ribbon and its tip dissolves. One instanced mesh; put it in a PixelStage.
 */
export const Ribbons: FC<RibbonsProps> = ({ count, radius, height, seed, time, camera, width = 0.36 }) => {
  const [minRadius, maxRadius] = radius;
  const geometry = useMemo(() => {
    const random = mulberry32(seed);
    const between = (min: number, max: number): number => min + (max - min) * random();
    const { positions, indices } = strip(SEGMENTS);

    const ribbons = new Float32Array(count * 4);
    const phases = new Float32Array(count);
    for (let index = 0; index < count; index++) {
      ribbons.set([between(0, Math.PI * 2), between(minRadius, maxRadius), between(0.15, 0.4), between(0.2, 0.5)], index * 4);
      phases[index] = between(0, Math.PI * 2);
    }

    const built = new InstancedBufferGeometry();
    built.setAttribute("position", new BufferAttribute(positions, 3));
    built.setIndex(indices);
    built.setAttribute("aRibbon", new InstancedBufferAttribute(ribbons, 4));
    built.setAttribute("aPhase", new InstancedBufferAttribute(phases, 1));
    built.instanceCount = count;
    return built;
  }, [count, minRadius, maxRadius, seed]);

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <RampMaterial
        ramp={RAMP}
        vertex={VERTEX}
        fragment={FRAGMENT}
        uniforms={{ uViewProjection: camera.viewProjection, uRight: camera.right, uTime: time, uHeight: height, uWidth: width }}
        doubleSided
      />
    </mesh>
  );
};
