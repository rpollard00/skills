import { ACTOR_IDS, effectsOfKind, type ActorId, type BattleState, type ConditionState } from "../../../battle";
import { mixVec, type StageCamera, type Vec3 } from "../../../gl";
import { clamp, clamp01, easeInCubic, easeOutBack, easeOutCubic, easeOutExpo, mod, progress, quantize } from "../../../kit";
import type { SceneClock, SceneOf } from "../../../useSceneClock";
import { MOTION } from "../timing";
import {
  addVec,
  BUILDS,
  BURST_POSE,
  cameraOf,
  GATE,
  GATE_TOP,
  levelBase,
  levelOfCondition,
  mixPose,
  REST_POSE,
  RETREAT,
  sealCenter,
  FRONT,
  STATIONS,
  STRIKE,
  WIDE_POSE,
  type Pose,
} from "../world";

const TONE = { energy2: 0, energy3: 1, energy4: 2, accent: 3, paper: 4 } as const;

export interface SealView {
  readonly cover: number;
  readonly lit: number;
  readonly fail: number;
}

export interface MemberView {
  readonly actor: ActorId;
  readonly base: Vec3;
  readonly head: Vec3;
  readonly anchor: Vec3;
  readonly away: boolean;
  readonly alpha: number;
}

export interface BeamView {
  readonly key: string;
  readonly from: Vec3;
  readonly to: Vec3;
  readonly tail: number;
  readonly head: number;
  readonly dashes: number;
  readonly phase: number;
  readonly tone: number;
  readonly alpha: number;
}

export interface SparkView {
  readonly key: string;
  readonly at: Vec3;
  readonly age: number;
  readonly tone: number;
  readonly half: number;
  readonly shape: "ring" | "rays";
}

export interface StageView {
  readonly time: number;
  readonly seconds: number;
  readonly camera: StageCamera;
  readonly seals: readonly SealView[];
  readonly split: readonly number[];
  readonly lift: readonly number[];
  readonly shake: Vec3;
  readonly charge: number;
  readonly burst: number;
  readonly members: Readonly<Record<ActorId, MemberView | null>>;
  readonly beams: readonly BeamView[];
  readonly sparks: readonly SparkView[];
  readonly scan: number | null;
  readonly wire: { readonly reveal: number; readonly alpha: number } | null;
  readonly flash: number;
  readonly rise: number;
  readonly motes: number;
  readonly ring: { readonly radius: number; readonly level: number };
  readonly core: {
    readonly halfWidth: number;
    readonly top: number;
    readonly low: number;
    readonly high: number;
    readonly soft: number;
  };
}

const sealView = (state: ConditionState, beat: number): SealView => {
  switch (state.kind) {
    case "unrecorded":
      return { cover: 0, lit: 0, fail: 0 };
    case "open":
      return { cover: 1, lit: 0, fail: 0 };
    case "failed": {
      const cooled = quantize(progress(beat, state.since, MOTION.failFlash), 6);
      return { cover: 1, lit: 0, fail: 1 - 0.7 * cooled };
    }
    case "proven":
      return { cover: clamp(1 - 0.86 * easeOutBack(progress(beat, state.since, MOTION.sealRetract)), 0.04, 1), lit: 1, fail: 0 };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
};

const lungeAt = (age: number): number => {
  if (age < -MOTION.windUp || age > MOTION.recoil) return 0;
  return age < 0 ? easeInCubic((age + MOTION.windUp) / MOTION.windUp) : 1 - easeOutCubic(age / MOTION.recoil);
};

const kickAt = (age: number): number => {
  if (age < 0 || age >= MOTION.kick) return 0;
  return [1, -0.6, 0.3][Math.floor((age / MOTION.kick) * 3)] ?? 0;
};

const HOP = 0.3;
const SPLIT = 12;
const DOOR_DRIFT = 0.25;
const COLUMN_GROWTH = 0.12;
const HEAD_ROOM = 0.25;

export const stageView = ({
  scene,
  clock,
  state,
}: {
  readonly scene: SceneOf<"battle">;
  readonly clock: SceneClock<"battle">;
  readonly state: BattleState;
}): StageView => {
  const { beat } = clock;
  const seconds = clock.filmFrame / clock.fps;
  const beatSeconds = clock.framesPerBeat / clock.fps;

  const hits = effectsOfKind(scene, "hit");
  const checks = effectsOfKind(scene, "check");
  const conditionIndex = (id: string): number => state.conditions.findIndex((condition) => condition.id === id);

  const openSince = state.gate.kind === "open" ? state.gate.since : null;
  const burstCue = clock.cue("open.burst");
  const burst = openSince === null ? -1 : burstCue.since;
  const burstBeat = beat - burstCue.since;
  const chargeSpan = openSince === null ? 0 : Math.max(0, burstBeat - openSince);
  const charged = openSince === null ? 0 : clamp(beat - openSince, 0, chargeSpan);
  const charge = openSince === null ? 0 : chargeSpan > 0 ? charged / chargeSpan : 1;
  const afterBurst = Math.max(0, burst);

  const beams: BeamView[] = [];
  const sparks: SparkView[] = [];
  let kick = 0;

  const records = effectsOfKind(scene, "record");
  const seals: SealView[] = Array.from({ length: GATE.levels }, () => ({ cover: 0, lit: 0, fail: 0 }));
  state.conditions.forEach((condition, index) => {
    const record = records.find((candidate) => candidate.effect.condition === condition.id);
    const closing = record === undefined ? 0 : easeInCubic(progress(beat, record.beat - MOTION.sealClose, MOTION.sealClose));
    seals[levelOfCondition(index)] =
      condition.state.kind === "unrecorded" ? { cover: closing, lit: 0, fail: 0 } : sealView(condition.state, beat);
    if (record !== undefined) kick += 0.6 * kickAt(beat - record.beat);
  });

  const stepIn = quantize(progress(beat, state.acting.since, MOTION.step), 3);
  const memberOf = (actor: ActorId): MemberView | null => {
    const member = state.party[actor];
    if (member.kind === "absent") return null;
    const stepped = state.acting.actor === actor ? stepIn : state.acting.previous === actor ? 1 - stepIn : 0;
    const lunge = Math.max(0, ...hits.filter((hit) => hit.effect.actor === actor).map((hit) => lungeAt(beat - hit.beat)));
    const retreat = actor === "mako" ? 0 : quantize(progress(burst, 0, MOTION.step), 3);
    const station = mixVec(STATIONS[actor], addVec(STATIONS[actor], RETREAT), retreat);
    const inLine = mixVec(station, FRONT, stepped);
    const hop = state.acting.actor === actor && stepped === 1 && lunge === 0 && burst < 0 && mod(beat, 1) < 0.25 ? HOP : 0;
    const base = addVec(mixVec(inLine, STRIKE, lunge), [0, hop, 0]);
    return {
      actor,
      base,
      head: addVec(base, [0, BUILDS[actor].height + HEAD_ROOM, 0]),
      anchor: addVec(inLine, [0, BUILDS[actor].height + HEAD_ROOM, 0]),
      away: lunge > 0,
      alpha: actor === "mako" ? 1 : quantize(progress(beat, member.since, MOTION.spawn), 8),
    };
  };
  const members: Record<ActorId, MemberView | null> = { mako: null, explorer: null, implementer: null, reviewer: null };
  for (const actor of ACTOR_IDS) members[actor] = memberOf(actor);

  const read = clock.cue("how.read");
  if (members.explorer !== null && read.since >= 0 && read.since < read.span) {
    for (let level = 0; level < GATE.levels; level++) {
      beams.push({
        key: `read${level}`,
        from: [-GATE.halfWidth, levelBase(level) + GATE.boxHeight / 2, GATE.halfDepth],
        to: members.explorer.head,
        tail: 0,
        head: clamp01(read.since / 0.5),
        dashes: 7,
        phase: beat * 3 + level * 0.37,
        tone: TONE.energy3,
        alpha: 1,
      });
    }
  }

  const front = (level: number): Vec3 => addVec(sealCenter(level), [0, 0, 0.12]);

  const recheck = clock.cue("fix.recheck");
  const rechecked = checks.find((check) => check.beat >= beat - recheck.since);
  if (members.mako !== null && rechecked !== undefined && recheck.since >= 0 && beat < rechecked.beat) {
    beams.push({
      key: "recheck",
      from: members.mako.head,
      to: front(levelOfCondition(conditionIndex(rechecked.effect.condition))),
      tail: 0,
      head: clamp01(recheck.since / 0.5),
      dashes: 9,
      phase: beat * 3,
      tone: TONE.energy3,
      alpha: 1,
    });
  }

  for (const check of checks) {
    const age = beat - check.beat;
    const level = levelOfCondition(conditionIndex(check.effect.condition));
    const failed = check.effect.outcome === "failed";
    if (members.mako !== null && age >= -MOTION.beamLead && age < MOTION.beamDrain) {
      beams.push({
        key: `check${check.beat}`,
        from: members.mako.head,
        to: front(level),
        tail: age < 0 || failed ? 0 : easeInCubic(age / MOTION.beamDrain),
        head: age < 0 ? easeOutCubic((age + MOTION.beamLead) / MOTION.beamLead) : 1,
        dashes: age >= 0 && failed ? 5 : 0,
        phase: 0,
        tone: age >= 0 && failed ? TONE.accent : TONE.energy4,
        alpha: age >= 0 && failed ? 1 - age / MOTION.beamDrain : 1,
      });
    }
    if (age >= 0 && age < MOTION.spark * 2) {
      sparks.push({
        key: `check${check.beat}`,
        at: front(level),
        age: age / (MOTION.spark * 2),
        tone: failed ? TONE.accent : TONE.energy4,
        half: 2.6,
        shape: "ring",
      });
    }
    if (failed) kick += 1.4 * kickAt(age);
  }

  for (const hit of hits) {
    const age = beat - hit.beat;
    if (age >= 0 && age < MOTION.spark) {
      sparks.push({ key: `hit${hit.beat}`, at: addVec(STRIKE, [1.0, 1.6, 0.2]), age: age / MOTION.spark, tone: TONE.paper, half: 2.2, shape: "rays" });
    }
    kick += kickAt(age);
  }

  clock.cue("reject.bounce").hits.forEach((age, index) => {
    if (age >= 0 && age < MOTION.spark) {
      sparks.push({ key: `bounce${index}`, at: front(levelOfCondition(index)), age: age / MOTION.spark, tone: TONE.accent, half: 2.4, shape: "rays" });
    }
    kick += 0.8 * kickAt(age);
  });

  const slam = state.claim.kind === "rejected" ? beat - state.claim.since : -1;

  const scanCue = clock.cue("review.scan");
  const scan = scanCue.since >= 0 && scanCue.since < scanCue.span ? GATE_TOP * (1 - scanCue.progress) : null;

  const wireCue = clock.cue("architect.wireframe");
  const architect = scene.shots.find((shot) => shot.id === "architect");
  const leaves = architect === undefined ? 0 : progress(clock.sinceShot("architect"), architect.beats - 1, 1);
  const wire =
    clock.shot === "architect" && wireCue.since >= 0
      ? { reveal: GATE_TOP + 1 - (GATE_TOP + 2) * wireCue.progress, alpha: 1 - quantize(leaves, 4) }
      : null;

  const rest: Pose = mixPose(WIDE_POSE, REST_POSE, easeOutCubic(progress(beat, 0, MOTION.settle)));
  const pulled = mixPose(rest, BURST_POSE, easeOutCubic(afterBurst / 6));
  const quake = burst >= 0 ? 0.35 * Math.exp(-1.2 * burst) : 0;
  const pose: Pose = {
    position: addVec(pulled.position, [quake * Math.sin(91.7 * clock.frame), quake * Math.cos(57.3 * clock.frame), 0]),
    target: pulled.target,
  };

  const part = (level: number): number =>
    burst < 0
      ? 0
      : SPLIT * easeOutExpo((burst - 0.08 * (GATE.levels - 1 - level)) / MOTION.part) + DOOR_DRIFT * Math.max(0, burst - MOTION.part);
  const pulse = mod(afterBurst, 1);
  const ring = burst < 0 ? { radius: 0, level: 0 } : burst < 2 ? { radius: 12 * burst, level: 1 - burst / 2 } : { radius: 22 * pulse, level: 0.8 * (1 - pulse) };
  const tremble = (level: number): number => (burst < 0 ? 0.05 * charged * Math.sin(40 * charged + level) : 0);

  return {
    time: seconds + 0.5 * charged * charged * beatSeconds + charged * afterBurst * beatSeconds,
    seconds,
    camera: cameraOf(pose),
    seals,
    split: Array.from({ length: GATE.levels }, (_, level) => part(level)),
    lift: Array.from({ length: GATE.levels }, (_, level) => tremble(level)),
    shake: [0.22 * kick, 0.3 * kickAt(slam), 0],
    charge,
    burst,
    members,
    beams,
    sparks,
    scan,
    wire,
    flash: burst >= 0 && burst < MOTION.flash ? 1 - burst / MOTION.flash : 0,
    rise: burst >= 0 ? progress(beat, scene.beats - MOTION.rise, MOTION.rise) ** 2 : 0,
    motes: burst >= 0 ? clamp01(burst) : 0.25 * charge,
    ring,
    core: {
      halfWidth: GATE.halfWidth - 0.4 + 2.2 * easeOutCubic(afterBurst / 1.5) + COLUMN_GROWTH * Math.max(0, afterBurst - 1.5),
      top: GATE_TOP - 0.05 + 90 * easeOutExpo(afterBurst / 1.5),
      low: burst >= 0 ? 0.45 : 0.16 + 0.3 * charge,
      high: burst >= 0 ? 1 : 0.5 + 0.5 * charge,
      soft: burst >= 0 ? 0.9 * clamp01(burst / 0.5) : 0,
    },
  };
};
