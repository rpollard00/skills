/** A strip from (0, 0) to (1, 1) with `segments` steps along y: the `position` values and the triangle indices. */
export const strip = (segments: number): { readonly positions: Float32Array; readonly indices: number[] } => {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let segment = 0; segment <= segments; segment++) {
    positions.push(0, segment / segments, 0, 1, segment / segments, 0);
    if (segment < segments) {
      const base = segment * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  return { positions: new Float32Array(positions), indices };
};
