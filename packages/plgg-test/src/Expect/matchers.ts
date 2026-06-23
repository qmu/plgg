import { deepEqual } from "plgg-test/Expect/equals";
import { formatValue } from "plgg-test/Expect/format";

/**
 * A matcher's verdict: did it pass, and the human messages for the
 * positive and negated failure cases. Pure data — `expect` turns a
 * failing verdict into a thrown AssertionError (Plan Amendment 5: the
 * boundary throws; matchers themselves stay pure predicates).
 */
export type MatchResult = Readonly<{
  pass: boolean;
  // Message shown when used positively (`expect(x).toBe(y)`) and it
  // fails.
  message: string;
  // Message shown when negated (`expect(x).not.toBe(y)`) and it fails.
  notMessage: string;
}>;

const has = (
  value: unknown,
  key: string,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  key in value;

export const toBe = (
  actual: unknown,
  expected: unknown,
): MatchResult => ({
  pass: Object.is(actual, expected),
  message: `expected ${formatValue(actual)} to be ${formatValue(expected)} (Object.is)`,
  notMessage: `expected ${formatValue(actual)} not to be ${formatValue(expected)}`,
});

export const toEqual = (
  actual: unknown,
  expected: unknown,
): MatchResult => ({
  pass: deepEqual(actual, expected),
  message: `expected ${formatValue(actual)} to deeply equal ${formatValue(expected)}`,
  notMessage: `expected ${formatValue(actual)} not to deeply equal ${formatValue(expected)}`,
});

// `toContain`: substring for strings, membership (Object.is) for
// arrays — both forms appear in the corpus.
export const toContain = (
  actual: unknown,
  expected: unknown,
): MatchResult => ({
  pass:
    typeof actual === "string"
      ? typeof expected === "string" &&
        actual.includes(expected)
      : Array.isArray(actual)
        ? actual.some((v) =>
            Object.is(v, expected),
          )
        : false,
  message: `expected ${formatValue(actual)} to contain ${formatValue(expected)}`,
  notMessage: `expected ${formatValue(actual)} not to contain ${formatValue(expected)}`,
});

export const toHaveLength = (
  actual: unknown,
  expected: number,
): MatchResult => ({
  pass:
    typeof actual === "string"
      ? actual.length === expected
      : Array.isArray(actual)
        ? actual.length === expected
        : has(actual, "length") &&
          lengthOf(actual) === expected,
  message: `expected ${formatValue(actual)} to have length ${expected}`,
  notMessage: `expected ${formatValue(actual)} not to have length ${expected}`,
});

// Reads a `.length` off an array-like object known (by `has`) to carry
// it, without an `as` cast.
const lengthOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null
    ? new Map(Object.entries(value)).get("length")
    : undefined;

// `toHaveProperty(path)` or `toHaveProperty(path, value)`. Path may be
// dotted (`a.b.c`).
export const toHaveProperty = (
  actual: unknown,
  path: string,
  hasValue: boolean,
  value: unknown,
): MatchResult => {
  const found = resolvePath(
    actual,
    path.split("."),
  );
  return {
    pass: found.present
      ? hasValue
        ? deepEqual(found.value, value)
        : true
      : false,
    message: hasValue
      ? `expected ${formatValue(actual)} to have property "${path}" equal to ${formatValue(value)}`
      : `expected ${formatValue(actual)} to have property "${path}"`,
    notMessage: `expected ${formatValue(actual)} not to have property "${path}"`,
  };
};

const resolvePath = (
  root: unknown,
  keys: ReadonlyArray<string>,
): Readonly<{
  present: boolean;
  value: unknown;
}> =>
  keys.reduce<
    Readonly<{
      present: boolean;
      value: unknown;
    }>
  >(
    (acc, key) =>
      acc.present && has(acc.value, key)
        ? {
            present: true,
            value: readProp(acc.value, key),
          }
        : { present: false, value: undefined },
    { present: true, value: root },
  );

// Reads a key off an object known (by `has`) to carry it, without an
// `as` cast — via the unknown-valued entries view.
const readProp = (
  o: unknown,
  key: string,
): unknown =>
  typeof o === "object" && o !== null
    ? new Map(Object.entries(o)).get(key)
    : undefined;

export const toBeInstanceOf = (
  actual: unknown,
  ctor: Function,
): MatchResult => ({
  pass: actual instanceof ctor,
  message: `expected ${formatValue(actual)} to be an instance of ${ctor.name}`,
  notMessage: `expected ${formatValue(actual)} not to be an instance of ${ctor.name}`,
});

export const toBeUndefined = (
  actual: unknown,
): MatchResult => ({
  pass: actual === undefined,
  message: `expected ${formatValue(actual)} to be undefined`,
  notMessage: `expected value not to be undefined`,
});

export const toBeDefined = (
  actual: unknown,
): MatchResult => ({
  pass: actual !== undefined,
  message: `expected ${formatValue(actual)} to be defined`,
  notMessage: `expected value to be undefined`,
});

export const toBeNull = (
  actual: unknown,
): MatchResult => ({
  pass: actual === null,
  message: `expected ${formatValue(actual)} to be null`,
  notMessage: `expected value not to be null`,
});

export const toBeGreaterThan = (
  actual: unknown,
  expected: number | bigint,
): MatchResult => ({
  pass:
    (typeof actual === "number" ||
      typeof actual === "bigint") &&
    actual > expected,
  message: `expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`,
  notMessage: `expected ${formatValue(actual)} not to be greater than ${formatValue(expected)}`,
});

export const toBeGreaterThanOrEqual = (
  actual: unknown,
  expected: number | bigint,
): MatchResult => ({
  pass:
    (typeof actual === "number" ||
      typeof actual === "bigint") &&
    actual >= expected,
  message: `expected ${formatValue(actual)} to be >= ${formatValue(expected)}`,
  notMessage: `expected ${formatValue(actual)} not to be >= ${formatValue(expected)}`,
});
