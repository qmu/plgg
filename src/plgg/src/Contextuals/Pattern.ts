import {
  Atomic,
  Or,
  isObj,
  hasProp,
} from "plgg/index";

/**
 * Creates appropriate pattern type based on value type.
 */
type Pattern<
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
  <TAG extends string>(__tag: TAG) =>
  <T>(value?: T): Pattern<T, TAG> =>
    ({
      __tag,
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
 * Checks if value has the basic matcher structure.
 */
const isMatcherAbstract = (
  p: unknown,
): p is {
  __tag: string;
  type: string;
  body: unknown;
} =>
  isObj(p) &&
  hasProp(p, "__tag") &&
  hasProp(p, "type") &&
  hasProp(p, "body");

/**
 * Pattern type for matching atomic values.
 */
export type VariantPatternAtomic<
  T extends Atomic,
> = {
  __tag: string;
  type: "atomic";
  body: T;
};

/**
 * Pattern type for matching object values.
 */
type VariantPatternObject<T> = {
  __tag: string;
  type: "object";
  body: T;
};

/**
 * Pattern type for matching tag-only values.
 */
type VariantPatternTag<T> = {
  __tag: T;
  type: "tag";
  body: undefined;
};

/**
 * Type predicate for atomic variant patterns.
 */
export type IsVariantPatternAtomic<P> =
  P extends {
    __tag: string;
    type: "atomic";
    body: Atomic;
  }
    ? true
    : false;

/**
 * Type predicate for object variant patterns.
 */
type IsVariantPatternObject<P> = P extends {
  __tag: string;
  type: "object";
  body: object;
}
  ? true
  : false;

/**
 * Type predicate for tag variant patterns.
 */
export type IsVariantPatternTag<P> = P extends {
  __tag: string;
  type: "tag";
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
 * Runtime check for object variant patterns.
 */
export const isVariantPatternObject = <T>(
  p: unknown,
): p is VariantPatternObject<T> =>
  isMatcherAbstract(p) && p.type === "object";

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
 * Extracts the body type from a variant pattern.
 */
export type ExtractBodyFromVariantPattern<P> =
  P extends {
    __tag: string;
    type: string;
    body: infer B;
  }
    ? B
    : never;
