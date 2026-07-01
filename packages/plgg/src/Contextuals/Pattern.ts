import {
  Atomic,
  Or,
  isObj,
  isAtomic,
  hasProp,
} from "plgg/index";

/**
 * Creates appropriate pattern type based on value type.
 */
type Pattern<
  T,
  TAG extends string,
> = T extends Atomic
  ? PatternAtomic<T>
  : T extends Record<string, unknown>
    ? PatternBoxedObject<T>
    : PatternIcon<TAG>;

/**
 * Creates a pattern matcher for variant values.
 */
export const pattern =
  <TAG extends string>(__tag: TAG) =>
  <T>(value?: T): Pattern<T, TAG> =>
    ({
      __tag,
      type: isAtomic(value)
        ? "atomic"
        : isObj(value)
          ? "object"
          : "tag",
      body: value,
    }) as Pattern<T, TAG>;

/**
 * Checks if value has the basic matcher structure.
 */
const isMatcherAbstract = (
  p: unknown,
): p is {
  __tag: string;
  type: string;
  body: unknown;
} =>
  typeof p === "object" &&
  p !== null &&
  hasProp(p, "__tag") &&
  hasProp(p, "type") &&
  hasProp(p, "body");

/**
 * Pattern type for matching atomic values.
 */
export type PatternAtomic<T extends Atomic> = {
  __tag: string;
  type: "atomic";
  body: T;
};

/**
 * Pattern type for matching object values.
 */
type PatternBoxedObject<T> = {
  __tag: string;
  type: "object";
  body: T;
};

/**
 * Pattern type for matching tag-only values.
 */
type PatternIcon<T> = {
  __tag: T;
  type: "tag";
  body: undefined;
};

/**
 * Type predicate for atomic variant patterns.
 */
type IsPatternAtomic<P> = P extends {
  __tag: string;
  type: "atomic";
  body: Atomic;
}
  ? true
  : false;

/**
 * Type predicate for object variant patterns.
 */
type IsPatternBoxedObject<P> = P extends {
  __tag: string;
  type: "object";
  body: object;
}
  ? true
  : false;

/**
 * Type predicate for tag variant patterns.
 */
export type IsPatternIcon<P> = P extends {
  __tag: string;
  type: "tag";
}
  ? true
  : false;

/**
 * Runtime check for atomic variant patterns.
 */
export const isPatternAtomic = <T extends Atomic>(
  p: unknown,
): p is PatternAtomic<T> =>
  isMatcherAbstract(p) && p.type === "atomic";
/**
 * Runtime check for object variant patterns.
 */
export const isPatternBoxedObject = <T>(
  p: unknown,
): p is PatternBoxedObject<T> =>
  isMatcherAbstract(p) && p.type === "object";

/**
 * Runtime check for tag variant patterns.
 */
export const isPatternIcon = <TAG>(
  p: unknown,
): p is PatternIcon<TAG> =>
  isMatcherAbstract(p) && p.type === "tag";

/**
 * Union type predicate for all variant patterns.
 */
export type IsPattern<P> = Or<
  IsPatternAtomic<P>,
  Or<
    IsPatternBoxedObject<P>,
    IsPatternIcon<P>
  >
>;

/**
 * Extracts the body type from a variant pattern.
 */
export type ExtractBodyFromBoxPattern<P> =
  P extends {
    __tag: string;
    type: string;
    body: infer B;
  }
    ? B
    : never;
