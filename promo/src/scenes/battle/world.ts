import { Matrix4, Vector3 } from "three";
import type { ActorId } from "../../battle";
import type { Task } from "../../film/task";
import { mixVec, stageCamera, type StageCamera, type Vec3 } from "../../gl";
import { PLATE } from "./layout";

export const GATE = { halfWidth: 5, boxHeight: 3, gap: 0.4, halfDepth: 1, levels: 3 satisfies Task["conditions"]["length"] } as const;
export const GATE_TOP = GATE.levels * GATE.boxHeight + (GATE.levels - 1) * GATE.gap;

export const SOCKET = { halfWidth: 4.2, inset: 0.55 } as const;

export const DISC_RADIUS = 27;

export const levelBase = (level: number): number => level * (GATE.boxHeight + GATE.gap);

export const sealCenter = (level: number): Vec3 => [0, levelBase(level) + GATE.boxHeight / 2, GATE.halfDepth];

export const levelOfCondition = (index: number): number => GATE.levels - 1 - index;

export interface Build {
  readonly radius: number;
  readonly height: number;
}

export const BUILDS: Readonly<Record<ActorId, Build>> = {
  mako: { radius: 1.05, height: 3.3 },
  explorer: { radius: 0.85, height: 2.5 },
  implementer: { radius: 0.85, height: 2.5 },
  reviewer: { radius: 0.85, height: 2.5 },
};

export const STATIONS: Readonly<Record<ActorId, Vec3>> = {
  mako: [-11.6, 0, 1.0],
  explorer: [-13.8, 0, 1.4],
  implementer: [-16.0, 0, 1.8],
  reviewer: [-18.2, 0, 2.2],
};

export const FRONT: Vec3 = [-7.3, 0, 2.4];

export const RETREAT: Vec3 = [-6.8, 0, 0];

export const STRIKE: Vec3 = [-GATE.halfWidth - 1.1, 0, GATE.halfDepth + 0.7];

export interface Pose {
  readonly position: Vec3;
  readonly target: Vec3;
}

export const REST_POSE: Pose = { position: [0, 16.2, 40.5], target: [0, 6.5, 0] };
export const WIDE_POSE: Pose = { position: [0, 22, 62], target: [0, 7.5, 0] };
export const BURST_POSE: Pose = { position: [0, 17.5, 55], target: [0, 8.5, 0] };

const FOV = 22;

export const addVec = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const mixPose = (from: Pose, to: Pose, t: number): Pose => ({
  position: mixVec(from.position, to.position, t),
  target: mixVec(from.target, to.target, t),
});

export const cameraOf = (pose: Pose): StageCamera =>
  stageCamera({ fov: FOV, aspect: PLATE.w / PLATE.h, position: pose.position, target: pose.target });

export const REST_CAMERA = cameraOf(REST_POSE);

export const shifted = (camera: StageCamera, offset: Vec3): StageCamera => ({
  ...camera,
  viewProjection: camera.viewProjection.clone().multiply(new Matrix4().makeTranslation(...offset)),
});

export interface Cell {
  readonly x: number;
  readonly y: number;
}

const plateCell = (camera: StageCamera, point: Vec3): Cell => {
  const clip = new Vector3(...point).applyMatrix4(camera.viewProjection);
  return { x: Math.round((clip.x * 0.5 + 0.5) * PLATE.w), y: Math.round((0.5 - clip.y * 0.5) * PLATE.h) };
};

export const frameCell = (camera: StageCamera, point: Vec3): Cell => {
  const cell = plateCell(camera, point);
  return { x: PLATE.x + cell.x, y: PLATE.y + cell.y };
};
