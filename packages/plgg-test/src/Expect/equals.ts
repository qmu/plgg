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
 */
export const deepEqual = (
  a: unknown,
  b: unknown,
): boolean => eq(a, b);

const tagOf = (v: unknown): string =>
  Object.prototype.toString.call(v);

// Reads an own property without an `as` cast: re-enters via the
// `unknown`-valued record view that `Object.entries` already exposes.
const entriesOf = (
  o: object,
): ReadonlyArray<
  readonly [string, unknown]
> => Object.entries(o);

const eq = (
  a: unknown,
  b: unknown,
): boolean =>
  Object.is(a, b)
    ? true
    : typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null
      ? false
      : eqObjects(a, b);

const eqObjects = (
  a: object,
  b: object,
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
          ? eqArray(a, b)
          : a instanceof Map &&
              b instanceof Map
            ? eqMap(a, b)
            : a instanceof Set &&
                b instanceof Set
              ? eqSet(a, b)
              : eqPlain(a, b);

const eqArray = (
  a: ReadonlyArray<unknown>,
  b: ReadonlyArray<unknown>,
): boolean =>
  a.length !== b.length
    ? false
    : a.every((v, i) => eq(v, b[i]));

const eqMap = (
  a: ReadonlyMap<unknown, unknown>,
  b: ReadonlyMap<unknown, unknown>,
): boolean =>
  a.size !== b.size
    ? false
    : [...a.entries()].every(
        ([k, v]) =>
          b.has(k) &&
          eq(v, b.get(k)),
      );

const eqSet = (
  a: ReadonlySet<unknown>,
  b: ReadonlySet<unknown>,
): boolean =>
  a.size !== b.size
    ? false
    : [...a].every((v) => b.has(v));

// Own enumerable [key, value] entries that participate in structural
// equality. Excludes:
//  - `undefined`-valued props (vitest's `toEqual` ignores them on
//    either side), and
//  - FUNCTION-valued props. plgg's Box values carry method-like
//    closures (`ok(42)` has `isOk`/`isErr`); two distinct instances
//    hold distinct closures, so comparing them by reference would make
//    every `toEqual(ok(x), ok(x))` fail. vitest's `toEqual` likewise
//    does not let differing function identities break object equality,
//    so we drop functions from the structural comparison.
const definedEntries = (
  o: object,
): ReadonlyArray<
  readonly [string, unknown]
> =>
  entriesOf(o).filter(
    ([, v]) =>
      v !== undefined &&
      typeof v !== "function",
  );

const eqPlain = (
  a: object,
  b: object,
): boolean => {
  const ea = definedEntries(a);
  const eb = definedEntries(b);
  const mb = new Map(eb);
  return ea.length !== eb.length
    ? false
    : ea.every(
        ([k, v]) =>
          mb.has(k) && eq(v, mb.get(k)),
      );
};
