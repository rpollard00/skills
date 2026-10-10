import { useMemo, type FC } from "react";
import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedBufferGeometry, Vector2, Vector3, Vector4 } from "three";
import { PixelStage, RampMaterial, strip } from "../../gl";
import { fnv1a, mulberry32 } from "../../kit";
import { ENERGY, GRID } from "../../theme";
import {
  CORE_FRAGMENT,
  CORE_VERTEX,
  GROUND_FRAGMENT,
  GROUND_VERTEX,
  MOTE_FRAGMENT,
  MOTE_VERTEX,
  RIBBON_FRAGMENT,
  RIBBON_VERTEX,
  RIDGE_FRAGMENT,
  RIDGE_VERTEX,
  SKY_FRAGMENT,
  SKY_VERTEX,
} from "./glsl";
import { MOUTH, type RidgeShape, type WellLook } from "./look";
import { wellView, type WellPose, type WellView } from "./view";

const SEED = fnv1a("the well");
const TAU = Math.PI * 2;

const COLUMN = { top: 46, bottom: -2, coreRadius: 2.6, moteTop: 40, moteReach: 15 } as const;
const LAND = { halfWidth: 260, ridgeTop: 40, near: 70 } as const;
const RIBBON_SEGMENTS = 96;
const NEAR_MOTE = 24;

const quadGeometry = (): BufferGeometry => {
  const { positions, indices } = strip(1);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
};

const ribbonGeometry = (count: number): InstancedBufferGeometry => {
  const random = mulberry32(SEED);
  const between = (min: number, max: number): number => min + (max - min) * random();
  const ribbons = new Float32Array(count * 4);
  const styles = new Float32Array(count * 4);
  for (let index = 0; index < count; index++) {
    const angle = ((index + between(-0.3, 0.3)) / count) * TAU * 3;
    const turn = random() < 0.5 ? -1 : 1;
    ribbons.set([angle, between(2.4, 6.2), turn * between(0.15, 0.4), turn * between(0.1, 0.26)], index * 4);
    styles.set([between(0, TAU), between(0.3, 0.62), between(0.35, 0.8), 0], index * 4);
  }
  const { positions, indices } = strip(RIBBON_SEGMENTS);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.setAttribute("aRibbon", new InstancedBufferAttribute(ribbons, 4));
  geometry.setAttribute("aStyle", new InstancedBufferAttribute(styles, 4));
  geometry.instanceCount = count;
  return geometry;
};

const moteGeometry = (count: number): InstancedBufferGeometry => {
  const random = mulberry32(SEED ^ 0x5bd1e995);
  const motes = new Float32Array(count * 4);
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const angle = random() * TAU;
    const reach = 1 + (COLUMN.moteReach - 1) * random() ** 1.6;
    motes.set([reach * Math.cos(angle), random() * COLUMN.moteTop, reach * Math.sin(angle), 1.5 + 3.5 * random()], index * 4);
    phases[index] = random() * TAU;
  }
  const { positions, indices } = strip(1);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.setAttribute("aMote", new InstancedBufferAttribute(motes, 4));
  geometry.setAttribute("aPhase", new InstancedBufferAttribute(phases, 1));
  geometry.instanceCount = count;
  return geometry;
};

const Ridge: FC<{ readonly shape: RidgeShape; readonly order: number; readonly view: WellView; readonly quad: BufferGeometry }> = ({
  shape,
  order,
  view,
  quad,
}) => {
  const phase = useMemo(() => {
    const random = mulberry32(SEED + order);
    return new Vector3(random() * TAU, random() * TAU, random() * TAU);
  }, [order]);
  return (
    <mesh geometry={quad} frustumCulled={false}>
      <RampMaterial
        ramp={[shape.color, shape.color]}
        vertex={RIDGE_VERTEX}
        fragment={RIDGE_FRAGMENT}
        uniforms={{
          uViewProjection: view.camera.viewProjection,
          uSlab: new Vector3(shape.z, LAND.halfWidth, LAND.ridgeTop),
          uShape: new Vector4(shape.base, shape.amp, shape.freq, shape.span),
          uPhase: phase,
        }}
        doubleSided
      />
    </mesh>
  );
};

export interface WellProps {
  readonly look: WellLook;
  readonly pose: WellPose;
  /** Take it from the film frame, so that it runs on across a cut. */
  readonly time: number;
  readonly y?: number;
  readonly rows?: number;
  readonly dimRows?: number;
}

export const Well: FC<WellProps> = ({ look, pose, time, y = 0, rows = GRID.rows, dimRows = 0 }) => {
  const view = wellView(pose, { cols: GRID.cols, rows });
  const quad = useMemo(quadGeometry, []);
  const ribbons = useMemo(() => ribbonGeometry(look.ribbonCount), [look.ribbonCount]);
  const motes = useMemo(() => moteGeometry(look.moteCount), [look.moteCount]);
  const flow = time * look.flow;
  const { viewProjection, right } = view.camera;
  const [back, front] = look.ridges;

  return (
    <PixelStage cols={GRID.cols} rows={rows} y={y}>
      <mesh geometry={quad} frustumCulled={false}>
        <RampMaterial
          ramp={look.sky}
          vertex={SKY_VERTEX}
          fragment={SKY_FRAGMENT}
          uniforms={{
            uHorizon: view.horizonRow,
            uSkyRows: look.skyRows ?? Math.max(1, view.horizonRow),
            uStops: new Vector2(...look.stops),
            uStars: look.stars,
            uDrift: Math.round(pose.shift[0]),
            uDimRows: dimRows,
          }}
          doubleSided
        />
      </mesh>

      <Ridge shape={back} order={1} view={view} quad={quad} />
      <Ridge shape={front} order={2} view={view} quad={quad} />

      <mesh geometry={quad} frustumCulled={false}>
        <RampMaterial
          ramp={look.ground}
          vertex={GROUND_VERTEX}
          fragment={GROUND_FRAGMENT}
          uniforms={{
            uViewProjection: viewProjection,
            uField: new Vector3(LAND.halfWidth, front.z, LAND.near),
            uMouth: new Vector3(MOUTH.inner, MOUTH.outer, look.pool),
            uTime: flow,
          }}
          doubleSided
        />
      </mesh>

      <mesh geometry={quad} frustumCulled={false}>
        <RampMaterial
          ramp={ENERGY}
          vertex={CORE_VERTEX}
          fragment={CORE_FRAGMENT}
          uniforms={{
            uViewProjection: viewProjection,
            uRight: right,
            uCore: new Vector2(COLUMN.coreRadius * look.spread, COLUMN.top),
            uTime: flow,
            uDimRows: dimRows,
          }}
          doubleSided
        />
      </mesh>

      <mesh geometry={ribbons} frustumCulled={false}>
        <RampMaterial
          ramp={ENERGY}
          vertex={RIBBON_VERTEX}
          fragment={RIBBON_FRAGMENT}
          uniforms={{
            uViewProjection: viewProjection,
            uToCamera: view.toCamera,
            uTime: flow,
            uColumn: new Vector3(COLUMN.top, look.spread, COLUMN.bottom),
            uCellsPerUnit: view.cellsPerUnit,
            uDimRows: dimRows,
          }}
          doubleSided
        />
      </mesh>

      <mesh geometry={motes} frustumCulled={false}>
        <RampMaterial
          ramp={ENERGY}
          vertex={MOTE_VERTEX}
          fragment={MOTE_FRAGMENT}
          uniforms={{
            uViewProjection: viewProjection,
            uTime: flow,
            uRise: new Vector2(COLUMN.moteTop, NEAR_MOTE),
            uLevels: new Vector2(...look.moteLevels),
            uDimRows: dimRows,
          }}
          doubleSided
        />
      </mesh>
    </PixelStage>
  );
};
