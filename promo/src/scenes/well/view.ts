import { Matrix4, Vector2, Vector4 } from "three";
import { mixVec, stageCamera, type StageCamera, type Vec3 } from "../../gl";
import { lerp } from "../../kit";
import { GRID } from "../../theme";

const FOV = 38;
const LENS = { cols: GRID.cols, rows: GRID.rows } as const;

export interface WellPose {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly shift: readonly [right: number, down: number];
  readonly zoom: number;
}

export interface WellView {
  readonly camera: StageCamera;
  readonly toCamera: Vector2;
  readonly horizonRow: number;
  readonly cellsPerUnit: number;
}

export const wellView = (pose: WellPose, stage: { readonly cols: number; readonly rows: number }): WellView => {
  const lens = stageCamera({ fov: FOV, aspect: LENS.cols / LENS.rows, position: pose.position, target: pose.target, far: 600 });
  const [right, down] = pose.shift;
  const frame = new Matrix4().set(
    (pose.zoom * LENS.cols) / stage.cols, 0, 0, (2 * right) / stage.cols,
    0, (pose.zoom * LENS.rows) / stage.rows, 0, (-2 * down) / stage.rows,
    0, 0, 1, 0,
    0, 0, 0, 1,
  );
  const viewProjection = frame.multiply(lens.viewProjection);

  const [px, , pz] = pose.position;
  const [tx, , tz] = pose.target;
  const level = new Vector4(tx - px, 0, tz - pz, 0).applyMatrix4(viewProjection);
  const horizonRow = Math.round(((1 - level.y / level.w) / 2) * stage.rows);

  return {
    camera: { viewProjection, right: lens.right, up: lens.up },
    toCamera: new Vector2(px, pz).normalize(),
    horizonRow,
    cellsPerUnit: (pose.zoom * LENS.rows) / 2 / Math.tan((FOV * Math.PI) / 360),
  };
};

export const mixPose = (from: WellPose, to: WellPose, t: number): WellPose => ({
  position: mixVec(from.position, to.position, t),
  target: mixVec(from.target, to.target, t),
  shift: [lerp(from.shift[0], to.shift[0], t), lerp(from.shift[1], to.shift[1], t)],
  zoom: lerp(from.zoom, to.zoom, t),
});
