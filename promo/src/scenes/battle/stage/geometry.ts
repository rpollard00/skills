import { BufferAttribute, BufferGeometry } from "three";
import type { Vec3 } from "../../../gl";
import { DISC_RADIUS, GATE, GATE_TOP, levelBase, SOCKET } from "../world";

type Quad = readonly [Vec3, Vec3, Vec3, Vec3];

const HALVES = [-1, 1] as const;
const LEVELS = Array.from({ length: GATE.levels }, (_, level) => level);

const corners = <T>(quad: readonly [T, T, T, T]): readonly T[] => [quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]];

const attribute = (values: readonly (readonly number[])[], size: number): BufferAttribute =>
  new BufferAttribute(new Float32Array(values.flat()), size);

const FACE = { side: 0, front: 1, top: 2 } as const;

const INSIDE: Vec3 = [9, 9, 9];

export const gateGeometry = (): BufferGeometry => {
  const positions: Vec3[] = [];
  const meta: Vec3[] = [];
  const edges: Vec3[] = [];
  const add = (quad: Quad, face: number, level: number, half: number, edge: (corner: Vec3) => Vec3 = () => INSIDE): void => {
    for (const corner of corners(quad)) {
      positions.push(corner);
      meta.push([face, level, half]);
      edges.push(edge(corner));
    }
  };
  for (const level of LEVELS) {
    const y0 = levelBase(level);
    const y1 = y0 + GATE.boxHeight;
    const z0 = -GATE.halfDepth;
    const z1 = GATE.halfDepth;
    for (const half of HALVES) {
      const x0 = half < 0 ? -GATE.halfWidth : 0;
      const x1 = half < 0 ? 0 : GATE.halfWidth;
      const outer = half < 0 ? x0 : x1;
      add([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], FACE.front, level, half, ([x, y]) => [Math.abs(x - outer), y - y0, y1 - y]);
      add([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], FACE.top, level, half);
      add([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], FACE.side, level, half);
      add([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], FACE.side, level, half);
      add([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], FACE.side, level, half);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(positions, 3));
  geometry.setAttribute("aMeta", attribute(meta, 3));
  geometry.setAttribute("aEdge", attribute(edges, 3));
  return geometry;
};

const PROUD = 0.03;

export const sealGeometry = (): BufferGeometry => {
  const positions: Vec3[] = [];
  const meta: Vec3[] = [];
  const local: (readonly [number, number])[] = [];
  for (const level of LEVELS) {
    const y0 = levelBase(level) + SOCKET.inset;
    const y1 = levelBase(level) + GATE.boxHeight - SOCKET.inset;
    const z = GATE.halfDepth + PROUD;
    for (const half of HALVES) {
      const u0 = half < 0 ? -1 : 0;
      const u1 = half < 0 ? 0 : 1;
      const quad: readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]] = [
        [u0, 0],
        [u1, 0],
        [u1, 1],
        [u0, 1],
      ];
      for (const [u, v] of corners(quad)) {
        positions.push([u * SOCKET.halfWidth, y0 + (y1 - y0) * v, z]);
        meta.push([0, level, half]);
        local.push([u, v]);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(positions, 3));
  geometry.setAttribute("aMeta", attribute(meta, 3));
  geometry.setAttribute("aLocal", attribute(local, 2));
  return geometry;
};

export const quadGeometry = (min: number, max: number): BufferGeometry => {
  const quad: Quad = [
    [min, min, 0],
    [max, min, 0],
    [max, max, 0],
    [min, max, 0],
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(corners(quad), 3));
  return geometry;
};

export const stripGeometry = (): BufferGeometry => {
  const quad: Quad = [
    [0, -1, 0],
    [1, -1, 0],
    [1, 1, 0],
    [0, 1, 0],
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(corners(quad), 3));
  return geometry;
};

const DISC_SEGMENTS = 96;

export const discGeometry = (): BufferGeometry => {
  const positions: Vec3[] = [];
  const rim = (index: number): Vec3 => {
    const angle = (index / DISC_SEGMENTS) * Math.PI * 2;
    return [Math.cos(angle) * DISC_RADIUS, 0, Math.sin(angle) * DISC_RADIUS];
  };
  for (let index = 0; index < DISC_SEGMENTS; index++) positions.push([0, 0, 0], rim(index), rim(index + 1));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(positions, 3));
  return geometry;
};

const PRISM_FACE = { shade: 0, light: 1, top: 2 } as const;

export const prismGeometry = (): BufferGeometry => {
  const front: readonly [number, number] = [0, 1];
  const left: readonly [number, number] = [-0.87, -0.5];
  const right: readonly [number, number] = [0.87, -0.5];
  const positions: Vec3[] = [];
  const faces: number[][] = [];
  const add = (quad: Quad, face: number): void => {
    for (const corner of corners(quad)) {
      positions.push(corner);
      faces.push([face]);
    }
  };
  const wall = (a: readonly [number, number], b: readonly [number, number], face: number): void =>
    add([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], 1, b[1]], [a[0], 1, a[1]]], face);
  wall(left, front, PRISM_FACE.shade);
  wall(front, right, PRISM_FACE.light);
  wall(right, left, PRISM_FACE.shade);
  for (const [x, z] of [left, front, right]) {
    positions.push([x, 1, z]);
    faces.push([PRISM_FACE.top]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(positions, 3));
  geometry.setAttribute("aFace", attribute(faces, 1));
  return geometry;
};

const SLACK = 0.25;

export const wireGeometry = (): BufferGeometry => {
  const positions: Vec3[] = [];
  const line = (a: Vec3, b: Vec3): void => void positions.push(a, b);
  const loop = (points: readonly Vec3[]): void => points.forEach((point, index) => line(point, points[(index + 1) % points.length] ?? point));

  const x = GATE.halfWidth + SLACK;
  const zFront = GATE.halfDepth + SLACK;
  const zBack = -GATE.halfDepth - SLACK;
  for (const level of LEVELS) {
    const y0 = levelBase(level) - SLACK / 2;
    const y1 = levelBase(level) + GATE.boxHeight + SLACK / 2;
    loop([[-x, y0, zFront], [x, y0, zFront], [x, y1, zFront], [-x, y1, zFront]]);
    loop([[-x, y1, zFront], [x, y1, zFront], [x, y1, zBack], [-x, y1, zBack]]);
    const s0 = levelBase(level) + SOCKET.inset;
    const s1 = levelBase(level) + GATE.boxHeight - SOCKET.inset;
    loop([[-SOCKET.halfWidth, s0, zFront], [SOCKET.halfWidth, s0, zFront], [SOCKET.halfWidth, s1, zFront], [-SOCKET.halfWidth, s1, zFront]]);
    line([0, s0, zFront], [0, s1, zFront]);
  }
  line([-x, -SLACK, zFront], [-x, GATE_TOP + SLACK, zFront]);
  line([x, -SLACK, zFront], [x, GATE_TOP + SLACK, zFront]);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute(positions, 3));
  return geometry;
};
