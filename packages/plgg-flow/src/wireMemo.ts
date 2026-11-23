import type { Point3 } from "plgg-board";
import { required } from "plgg-flow/wireGeometry";
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

// Preserve exact coordinates without decimal formatting in cache keys.
export const pathValues = (
  points: readonly Point3[],
) => {
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
    key += String.fromCharCode(
      ...words.subarray(i, i + 4096),
    );
  return key;
};
