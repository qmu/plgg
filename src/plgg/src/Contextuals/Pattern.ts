import {
  Atomic,
  Or,
  isObj,
  hasProp,
} from "plgg/index";

/**
 * Checks if value has the basic matcher structure.
 */
export const isMatcherAbstract = (
  p: unknown,
): p is {
  tag: string;
  type: string;
  body: unknown;
} =>
  isObj(p) &&
  hasProp(p, "tag") &&
  hasProp(p, "type") &&
  hasProp(p, "body");

/**
 * Pattern type for matching atomic values.
 */
export type VariantPatternAtomic<
  T extends Atomic,
> = {
  tag: string;
  type: "atomic";
  body: T;
};

/**
 * Type predicate for atomic variant patterns.
 */
export type IsVariantPatternAtomic<P> =
  P extends {
    tag: string;
    type: "atomic";
    body: Atomic;
  }
    ? true
    : false;

/**
 * Runtime check for atomic variant patterns.
 */
export const isVariantPatternAtomic = <
  T extends Atomic,
>(
  p: unknown,
): p is VariantPatternAtomic<T> =>
  isMatcherAbstract(p) && p.type === "atomic";

/**
 * Pattern type for matching object values.
 */
export type VariantPatternObject<T> = {
  tag: string;
  type: "object";
  body: T;
};

/**
 * Type predicate for object variant patterns.
 */
export type IsVariantPatternObject<P> =
  P extends {
    tag: string;
    type: "object";
    body: object;
  }
    ? true
    : false;

/**
 * Runtime check for object variant patterns.
 */
export const isVariantPatternObject = <T>(
  p: unknown,
): p is VariantPatternObject<T> =>
  isMatcherAbstract(p) && p.type === "object";

/**
 * Pattern type for matching tag-only values.
 */
export type VariantPatternTag<T> = {
  tag: T;
  type: "tag";
  body: undefined;
};

/**
 * Type predicate for tag variant patterns.
 */
export type IsVariantPatternTag<P> = P extends {
  tag: string;
  type: "tag";
}
  ? true
  : false;

/**
 * Runtime check for tag variant patterns.
 */
export const isVariantPatternTag = <TAG>(
  p: unknown,
): p is VariantPatternTag<TAG> =>
  isMatcherAbstract(p) && p.type === "tag";

/**
 * Union type predicate for all variant patterns.
 */
export type IsVariantPattern<P> = Or<
  IsVariantPatternAtomic<P>,
  Or<
    IsVariantPatternObject<P>,
    IsVariantPatternTag<P>
  >
>;

/**
 * Creates appropriate pattern type based on value type.
 */
export type Pattern<
  T,
  TAG extends string,
> = T extends Atomic
  ? VariantPatternAtomic<T>
  : T extends Record<string, unknown>
    ? VariantPatternObject<T>
    : VariantPatternTag<TAG>;

/**
 * Creates a pattern matcher for variant values.
 */
export const pattern =
  <TAG extends string>(tag: TAG) =>
  <T>(value?: T): Pattern<T, TAG> =>
    ({
      tag,
      type:
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
          ? "atomic"
          : typeof value === "object" &&
              value !== null
            ? "object"
            : "tag",
      body: value,
    }) as Pattern<T, TAG>;

/**
 * Extracts the body type from a variant pattern.
 */
export type ExtractBodyFromVariantPattern<P> =
  P extends {
    tag: string;
    type: string;
    body: infer B;
  }
    ? B
    : never;
