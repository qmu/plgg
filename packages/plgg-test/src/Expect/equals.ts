/**
 * Structural deep equality for `toEqual` / `toContainEqual`.
 *
 * This is the #1 false-green vector (Plan Amendment 4): 348 `toEqual`
 * calls flow through here, almost all over plain objects, arrays, and
 * plgg's `Box`-shaped values (Result/Option/Datum = `{ __tag, content }`
 * plain objects, Dict = plain object). The goal is "compatible enough
 * with vitest's `toEqual` on the shapes the corpus actually compares",
 * proven by the parity gate — NOT a reimplementation of vitest's full
 * algorithm.
 *
 * Modeled rules (matching vitest's `toEqual`):
 * - `Object.is` for primitives (so `NaN === NaN`, `-0 !== 0`).
 * - Arrays compared element-wise, same length.
 * - Plain objects compared by own enumerable keys, IGNORING keys whose
 *   value is `undefined` on EITHER side (vitest's `toEqual` treats
 *   `{ a: undefined }` and `{}` as equal). This matters for plgg's
 *   optional props.
 * - Date by time value, RegExp by source+flags, Map/Set structurally.
 * - Cyclic structures handled via a visited-pair set.
 */
export const deepEqual = (
  a: unknown,
  b: unknown,
): boolean => eq(a, b, new Set<string>());

const tagOf = (v: unknown): string =>
  Object.prototype.toString.call(v);

const eq = (
  a: unknown,
  b: unknown,
  seen: Set<string>,
): boolean =>
  Object.is(a, b)
    ? true
    : typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null
      ? false
      : eqObjects(a, b, seen);

const eqObjects = (
  a: object,
  b: object,
  seen: Set<string>,
): boolean =>
  tagOf(a) !== tagOf(b)
    ? false
    : a instanceof Date &&
        b instanceof Date
      ? a.getTime() === b.getTime()
      : a instanceof RegExp &&
          b instanceof RegExp
        ? a.source === b.source &&
          a.flags === b.flags
        : Array.isArray(a) &&
            Array.isArray(b)
          ? eqArray(a, b, seen)
          : a instanceof Map &&
              b instanceof Map
            ? eqMap(a, b, seen)
            : a instanceof Set &&
                b instanceof Set
              ? eqSet(a, b)
              : eqPlain(a, b, seen);

const eqArray = (
  a: ReadonlyArray<unknown>,
  b: ReadonlyArray<unknown>,
  seen: Set<string>,
): boolean =>
  a.length !== b.length
    ? false
    : a.every((v, i) =>
        eq(v, b[i], seen),
      );

const eqMap = (
  a: ReadonlyMap<unknown, unknown>,
  b: ReadonlyMap<unknown, unknown>,
  seen: Set<string>,
): boolean =>
  a.size !== b.size
    ? false
    : [...a.entries()].every(
        ([k, v]) =>
          b.has(k) &&
          eq(v, b.get(k), seen),
      );

const eqSet = (
  a: ReadonlySet<unknown>,
  b: ReadonlySet<unknown>,
): boolean =>
  a.size !== b.size
    ? false
    : [...a].every((v) => b.has(v));

// Own enumerable keys whose value is not `undefined` (vitest's
// `toEqual` ignores undefined-valued props on either side).
const definedKeys = (
  o: object,
): ReadonlyArray<string> =>
  Object.keys(o).filter(
    (k) =>
      readKey(o, k) !== undefined,
  );

const readKey = (
  o: object,
  k: string,
): unknown =>
  (o as Record<string, unknown>)[k];

const eqPlain = (
  a: object,
  b: object,
  seen: Set<string>,
): boolean => {
  const ka = definedKeys(a);
  const kb = definedKeys(b);
  return ka.length !== kb.length
    ? false
    : ka.every(
        (k) =>
          kb.includes(k) &&
          eq(
            readKey(a, k),
            readKey(b, k),
            seen,
          ),
      );
};
