import type { Point3 } from "plgg-board";
import {
  required,
  type Box,
} from "plgg-flow/wireGeometry";
// Eviction changes only the amount of work on the next call.
export const cache = <T>(limit = 2048) => {
  const entries = new Map<string, T>();
  return (key: string, make: () => T) => {
    const hit = entries.get(key);
    if (hit !== undefined) return hit;
    const value = make();
    if (entries.size >= limit)
      entries.delete(
        required(entries.keys().next().value),
      );
    entries.set(key, value);
    return value;
  };
};

// Boxes are immutable during a solve. Reuse their value keys across local queries.
const boxIds = new WeakMap<Box, number>();
const boxValues = cache<number>(4096);
let nextBox = 0;
export const boxId = (box: Box) => {
  const known = boxIds.get(box);
  if (known !== undefined) return known;
  const id = boxValues(
    JSON.stringify(box),
    () => ++nextBox,
  );
  boxIds.set(box, id);
  return id;
};

const pathKeys = new WeakMap<
  readonly Point3[],
  string
>();
// Preserve exact coordinates without decimal formatting in cache keys.
export const pathValues = (
  points: readonly Point3[],
) => {
  const hit = pathKeys.get(points);
  if (hit !== undefined) return hit;
  const values = new Float64Array(
    points.length * 3,
  );
  for (const [i, p] of points.entries()) {
    values[3 * i] = p.x;
    values[3 * i + 1] = p.y;
    values[3 * i + 2] = p.z;
  }
  const words = new Uint16Array(values.buffer);
  let key = "";
  for (let i = 0; i < words.length; i += 4096)
    key += Reflect.apply(
      String.fromCharCode,
      undefined,
      words.subarray(i, i + 4096),
    );
  pathKeys.set(points, key);
  return key;
};
