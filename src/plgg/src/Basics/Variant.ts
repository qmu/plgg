import { isObj, hasProp } from "plgg/index";

/**
 * A variant with only a tag and no body.
 */
export type FixedVariant<TAG extends string> = {
  __tag: TAG;
  body: undefined;
};

/**
 * A variant with both a tag and body.
 */
export type ParametricVariant<
  TAG extends string,
  BODY,
> = {
  __tag: TAG;
  body: BODY;
};

/**
 * Union of fixed and parametric variants.
 */
export type Variant<TAG extends string, BODY> =
  | FixedVariant<TAG>
  | ParametricVariant<TAG, BODY>;

export const isPatternAbstract = (
  p: unknown,
): p is {
  tag: string;
  type: string;
  body?: unknown;
} =>
  isObj(p) &&
  hasProp(p, "tag") &&
  hasProp(p, "type") &&
  hasProp(p, "body");

export type AtomicPattern<T> = {
  tag: string;
  type: "atomic";
  body: T;
};

export const isAtomicPattern = <T>(
  p: unknown,
): p is AtomicPattern<T> =>
  isPatternAbstract(p) && p.type === "atomic";

export type ObjectPattern<T> = {
  tag: string;
  type: "object";
  body: Partial<T>;
};

export const isObjectPattern = <T>(
  p: unknown,
): p is ObjectPattern<T> =>
  isPatternAbstract(p) && p.type === "object";

export type FixedVariantPattern = {
  tag: string;
  type: "fixed";
};

export const isFixedVariantPattern = (
  p: unknown,
): p is FixedVariantPattern =>
  isPatternAbstract(p) && p.type === "fixed";

type Atomic = boolean | number | string | bigint;

export type Pattern<T> = T extends Atomic
  ? AtomicPattern<T>
  : T extends Record<string, unknown>
    ? ObjectPattern<T>
    : FixedVariantPattern;

export const pattern =
  <
    V extends Variant<string, unknown>,
    T = ExtractBody<V>,
  >(
    tag: string,
  ) =>
  (value?: T): Pattern<T> =>
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
            : "fixed",
      body: value,
    }) as Pattern<T>;

/**
 * Type guard to check if a value is any variant.
 */
export const isVariant = (
  v: unknown,
): v is Variant<string, unknown> =>
  isObj(v) &&
  hasProp(v, "__tag") &&
  hasProp(v, "body");

/**
 * Creates a type guard to check if a variant has a specific tag.
 */
export const hasTag =
  <TAG extends string>(tag: TAG) =>
  <T>(v: unknown): v is Variant<TAG, T> =>
    isVariant(v) && v.__tag === tag;

/**
 * TODO: Validator function for variants.
 * Will provide safe casting from unknown to specific variant types.
 */
export const asVariant = () => {};

/**
 * TODO: body extractor for parametric variants.
 * Will provide safe extraction of body from variants.
 */
export const withbody = () => {};

/**
 * Creates a variant constructor for a specific tag.
 */
export function construct<
  V extends Variant<string, unknown>,
  TAG extends string = ExtractTag<V>,
  BODY = ExtractBody<V>,
>(__tag: TAG) {
  function maker(): FixedVariant<TAG>;
  function maker(
    body: BODY,
  ): ParametricVariant<TAG, BODY>;
  function maker(
    body?: BODY,
  ):
    | FixedVariant<TAG>
    | ParametricVariant<TAG, BODY> {
    return body === undefined
      ? ({ __tag, body: undefined } as const)
      : ({ __tag, body: body } as const);
  }
  return maker;
}

/**
 * Extracts the body type from a variant type.
 */
export type ExtractBody<
  V extends Variant<string, unknown>,
> =
  V extends Variant<string, infer BODY>
    ? BODY
    : undefined;

/**
 * Extracts the tag type from a variant type using conditional type inference.
 * This utility type helps in type-level operations where we need to work with
 * the tag portion of a variant type separately from its body.
 *
 * @template V - Variant type to extract tag from
 */
type ExtractTag<
  V extends Variant<string, unknown>,
> =
  V extends Variant<infer TAG, unknown>
    ? TAG
    : never;
