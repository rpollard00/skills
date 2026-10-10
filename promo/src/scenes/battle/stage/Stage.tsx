import { useMemo, type FC } from "react";
import { Vector2, Vector3, Vector4 } from "three";
import { ACTOR_IDS, type ActorId } from "../../../battle";
import { PixelStage, RampMaterial, Ribbons, type StageCamera, type Vec3 } from "../../../gl";
import { clamp01, easeOutExpo, fnv1a } from "../../../kit";
import { COVER_COLORS, ENERGY, GATE as GATE_COLORS, KIND_RAMPS, THEMES, type Hex } from "../../../theme";
import { PLATE } from "../layout";
import { BUILDS, DISC_RADIUS, GATE, shifted } from "../world";
import { discGeometry, gateGeometry, prismGeometry, quadGeometry, sealGeometry, stripGeometry, wireGeometry } from "./geometry";
import {
  BEAM_FRAGMENT,
  BEAM_VERTEX,
  BILLBOARD_VERTEX,
  CORE_FRAGMENT,
  CORE_VERTEX,
  FLASH_FRAGMENT,
  FLOOR_FRAGMENT,
  FLOOR_VERTEX,
  GATE_FRAGMENT,
  GATE_VERTEX,
  MOTE_FRAGMENT,
  PRISM_FRAGMENT,
  PRISM_VERTEX,
  RISE_FRAGMENT,
  SCAN_FRAGMENT,
  SCREEN_VERTEX,
  SEAL_FRAGMENT,
  SEAL_VERTEX,
  SKY_FRAGMENT,
  SPARK_FRAGMENT,
  STREAM_FRAGMENT,
  STREAM_VERTEX,
  WIRE_FRAGMENT,
  WIRE_VERTEX,
} from "./shaders";
import type { BeamView, MemberView, SparkView, StageView } from "./view";

const DARK = THEMES.dark;
const PAPER = DARK.onAccent;

const SKY_RAMP: readonly Hex[] = [DARK.chrome, ENERGY[0], ENERGY[1], ENERGY[2]];
const FLOOR_RAMP: readonly Hex[] = [GATE_COLORS.side, ENERGY[0], ENERGY[1], ENERGY[2], ENERGY[4]];
const STRUCTURE = { face: DARK.page, edge: KIND_RAMPS.craft[0], light: DARK.mutedOnChrome } as const;
const GATE_RAMP: readonly Hex[] = [GATE_COLORS.side, STRUCTURE.face, STRUCTURE.edge, STRUCTURE.edge, STRUCTURE.light];
const SEAL_RAMP: readonly Hex[] = [ENERGY[1], ENERGY[2], ENERGY[3], ENERGY[4], PAPER, DARK.chrome, DARK.accent, GATE_COLORS.side, STRUCTURE.edge];
const CORE_RAMP: readonly Hex[] = [...ENERGY];
const TONE_RAMP: readonly Hex[] = [ENERGY[2], ENERGY[3], ENERGY[4], DARK.accent, PAPER];
const SCAN_RAMP: readonly Hex[] = [DARK.muted, PAPER];
const WIRE_RAMP: readonly Hex[] = [DARK.muted, PAPER];
const FLASH_RAMP: readonly Hex[] = [ENERGY[3], ENERGY[4]];
const MOTE_RAMP: readonly Hex[] = [ENERGY[3], ENERGY[4]];
const RISE_RAMP: readonly Hex[] = [COVER_COLORS.energy, ENERGY[4]];

const PRISM_RAMPS: Readonly<Record<ActorId, readonly Hex[]>> = {
  mako: [KIND_RAMPS.craft[1], PAPER, KIND_RAMPS.craft[3], DARK.accent],
  explorer: [KIND_RAMPS.craft[0], KIND_RAMPS.craft[1], PAPER, DARK.accent],
  implementer: [KIND_RAMPS.craft[0], KIND_RAMPS.craft[1], PAPER, DARK.accent],
  reviewer: [KIND_RAMPS.craft[0], KIND_RAMPS.craft[1], PAPER, DARK.accent],
};
const MAKO_BAND = new Vector2(0.6, 0.8);
const NO_BAND = new Vector2(2, 2);

const STREAMS = [
  {
    key: "far",
    plane: new Vector4(70, -16, 40, -60),
    shape: new Vector4(18, 3, 0.9, 5),
    ramps: [
      [ENERGY[0], ENERGY[0], ENERGY[1], ENERGY[1]],
      [ENERGY[0], ENERGY[1], ENERGY[1], ENERGY[2]],
      [ENERGY[1], ENERGY[1], ENERGY[1], ENERGY[2]],
    ],
  },
  {
    key: "near",
    plane: new Vector4(50, -14, 34, -29),
    shape: new Vector4(10, 11, 1.1, 4),
    ramps: [
      [ENERGY[1], ENERGY[1], ENERGY[1], ENERGY[2]],
      [ENERGY[1], ENERGY[1], ENERGY[2], ENERGY[2]],
      [ENERGY[1], ENERGY[2], ENERGY[2], ENERGY[3]],
    ],
  },
] as const satisfies readonly { readonly key: string; readonly plane: Vector4; readonly shape: Vector4; readonly ramps: readonly (readonly Hex[])[] }[];

const BURST_SEED = fnv1a("gate open");
const BEAM_HALF = 0.11;
const SEAM = 0.11;
const CORE_DEPTH = 0.5;
const SCAN_HALF = new Vector2(GATE.halfWidth + 0.3, 0.9);

const vec3 = (value: Vec3): Vector3 => new Vector3(...value);

const Prism: FC<{ readonly member: MemberView; readonly camera: StageCamera }> = ({ member, camera }) => {
  const geometry = useMemo(prismGeometry, []);
  const build = BUILDS[member.actor];
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <RampMaterial
        ramp={PRISM_RAMPS[member.actor]}
        vertex={PRISM_VERTEX}
        fragment={PRISM_FRAGMENT}
        uniforms={{
          uViewProjection: camera.viewProjection,
          uBase: vec3(member.base),
          uSize: new Vector2(build.radius, build.height),
          uAlpha: member.alpha,
          uBand: member.actor === "mako" ? MAKO_BAND : NO_BAND,
        }}
        doubleSided
      />
    </mesh>
  );
};

const Beam: FC<{ readonly beam: BeamView; readonly camera: StageCamera }> = ({ beam, camera }) => {
  const geometry = useMemo(stripGeometry, []);
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <RampMaterial
        ramp={TONE_RAMP}
        vertex={BEAM_VERTEX}
        fragment={BEAM_FRAGMENT}
        uniforms={{
          uViewProjection: camera.viewProjection,
          uFrom: vec3(beam.from),
          uTo: vec3(beam.to),
          uUp: camera.up,
          uHalf: BEAM_HALF,
          uSpan: new Vector2(beam.tail, beam.head),
          uDash: new Vector2(beam.dashes, beam.phase),
          uTone: beam.tone,
          uAlpha: beam.alpha,
        }}
        doubleSided
      />
    </mesh>
  );
};

const Spark: FC<{ readonly spark: SparkView; readonly camera: StageCamera }> = ({ spark, camera }) => {
  const geometry = useMemo(() => quadGeometry(-1, 1), []);
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <RampMaterial
        ramp={TONE_RAMP}
        vertex={BILLBOARD_VERTEX}
        fragment={SPARK_FRAGMENT}
        uniforms={{
          uViewProjection: camera.viewProjection,
          uAt: vec3(spark.at),
          uRight: camera.right,
          uUp: camera.up,
          uHalf: new Vector2(spark.half, spark.half),
          uAge: spark.age,
          uTone: spark.tone,
          uRays: spark.shape === "rays" ? 1 : 0,
        }}
        doubleSided
      />
    </mesh>
  );
};

export const Stage: FC<{ readonly view: StageView }> = ({ view }) => {
  const { camera } = view;
  const screen = useMemo(() => quadGeometry(-1, 1), []);
  const unit = useMemo(() => quadGeometry(0, 1), []);
  const disc = useMemo(discGeometry, []);
  const gate = useMemo(gateGeometry, []);
  const seals = useMemo(sealGeometry, []);
  const wire = useMemo(wireGeometry, []);

  const motion = {
    uViewProjection: camera.viewProjection,
    uSplit: view.split,
    uLift: view.lift,
    uShake: vec3(view.shake),
  };
  const burstHeight = 70 * easeOutExpo(Math.max(0, view.burst) / 3);

  return (
    <PixelStage cols={PLATE.w} rows={PLATE.h} x={PLATE.x} y={PLATE.y}>
      <mesh geometry={screen} frustumCulled={false}>
        <RampMaterial ramp={SKY_RAMP} vertex={SCREEN_VERTEX} fragment={SKY_FRAGMENT} uniforms={{ uDepth: 1, uGlow: 0.2 * view.charge + 0.25 * clamp01(view.burst / 3) }} doubleSided />
      </mesh>

      {STREAMS.map((stream) => (
        <mesh key={stream.key} geometry={unit} frustumCulled={false}>
          <RampMaterial
            ramp={stream.ramps[Math.min(stream.ramps.length - 1, Math.floor(view.charge * stream.ramps.length))] ?? stream.ramps[0]}
            vertex={STREAM_VERTEX}
            fragment={STREAM_FRAGMENT}
            uniforms={{ uViewProjection: camera.viewProjection, uPlane: stream.plane, uShape: stream.shape, uTime: view.time }}
            doubleSided
          />
        </mesh>
      ))}

      <mesh geometry={disc} frustumCulled={false}>
        <RampMaterial
          ramp={FLOOR_RAMP}
          vertex={FLOOR_VERTEX}
          fragment={FLOOR_FRAGMENT}
          uniforms={{
            uViewProjection: camera.viewProjection,
            uRadius: DISC_RADIUS,
            uGlow: view.charge,
            uRing: new Vector2(view.ring.radius, view.ring.level),
          }}
          doubleSided
        />
      </mesh>

      <mesh geometry={unit} frustumCulled={false}>
        <RampMaterial
          ramp={CORE_RAMP}
          vertex={CORE_VERTEX}
          fragment={CORE_FRAGMENT}
          uniforms={{
            uViewProjection: camera.viewProjection,
            uShake: vec3(view.shake),
            uShape: new Vector4(view.core.halfWidth, 0.05, view.core.top, CORE_DEPTH),
            uTime: view.time,
            uLevel: new Vector2(view.core.low, view.core.high),
            uSoft: view.core.soft,
            uSlabs: view.burst >= 0 ? 1 : 0,
          }}
          doubleSided
        />
      </mesh>

      {view.burst >= 0 ? (
        <Ribbons
          count={96}
          radius={[0.5, 5]}
          height={burstHeight}
          seed={BURST_SEED}
          time={view.time}
          camera={shifted(camera, [0, burstHeight / 2, 0])}
          width={0.6}
        />
      ) : null}

      <mesh geometry={gate} frustumCulled={false}>
        <RampMaterial ramp={GATE_RAMP} vertex={GATE_VERTEX} fragment={GATE_FRAGMENT} uniforms={motion} doubleSided />
      </mesh>

      <mesh geometry={seals} frustumCulled={false}>
        <RampMaterial
          ramp={SEAL_RAMP}
          vertex={SEAL_VERTEX}
          fragment={SEAL_FRAGMENT}
          uniforms={{
            ...motion,
            uCover: view.seals.map((seal) => seal.cover),
            uLit: view.seals.map((seal) => seal.lit),
            uFail: view.seals.map((seal) => seal.fail),
            uSeam: SEAM,
            uTime: view.time,
            uCharge: 0.5 * view.charge,
          }}
          doubleSided
        />
      </mesh>

      {view.wire === null ? null : (
        <lineSegments geometry={wire} frustumCulled={false}>
          <RampMaterial
            ramp={WIRE_RAMP}
            vertex={WIRE_VERTEX}
            fragment={WIRE_FRAGMENT}
            uniforms={{ uViewProjection: camera.viewProjection, uReveal: view.wire.reveal, uAlpha: view.wire.alpha }}
          />
        </lineSegments>
      )}

      {view.scan === null ? null : (
        <mesh geometry={screen} frustumCulled={false}>
          <RampMaterial
            ramp={SCAN_RAMP}
            vertex={BILLBOARD_VERTEX}
            fragment={SCAN_FRAGMENT}
            uniforms={{
              uViewProjection: camera.viewProjection,
              uAt: new Vector3(0, view.scan + SCAN_HALF.y, GATE.halfDepth + 0.08),
              uRight: new Vector3(1, 0, 0),
              uUp: new Vector3(0, 1, 0),
              uHalf: SCAN_HALF,
              uAlpha: 1,
            }}
            doubleSided
          />
        </mesh>
      )}

      {ACTOR_IDS.map((actor) => {
        const member = view.members[actor];
        return member === null ? null : <Prism key={actor} member={member} camera={camera} />;
      })}
      {view.beams.map((beam) => (
        <Beam key={beam.key} beam={beam} camera={camera} />
      ))}
      {view.sparks.map((spark) => (
        <Spark key={spark.key} spark={spark} camera={camera} />
      ))}

      {view.motes > 0 ? (
        <mesh geometry={screen} frustumCulled={false}>
          <RampMaterial ramp={MOTE_RAMP} vertex={SCREEN_VERTEX} fragment={MOTE_FRAGMENT} uniforms={{ uDepth: -0.9, uSeconds: view.seconds, uLevel: view.motes }} doubleSided />
        </mesh>
      ) : null}

      {view.rise > 0 ? (
        <mesh geometry={screen} frustumCulled={false}>
          <RampMaterial ramp={RISE_RAMP} vertex={SCREEN_VERTEX} fragment={RISE_FRAGMENT} uniforms={{ uDepth: -0.95, uRise: view.rise }} doubleSided />
        </mesh>
      ) : null}

      {view.flash > 0 ? (
        <mesh geometry={screen} frustumCulled={false}>
          <RampMaterial ramp={FLASH_RAMP} vertex={SCREEN_VERTEX} fragment={FLASH_FRAGMENT} uniforms={{ uDepth: -1, uLevel: view.flash }} doubleSided />
        </mesh>
      ) : null}
    </PixelStage>
  );
};
