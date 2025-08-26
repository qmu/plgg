import { isObj, hasProp, Or } from "plgg/index";

/**
 * A variant with only a tag and no body.
 */
export type FixedVariant<TAG extends string> = {
  __tag: TAG;
  body: undefined;
};

export type IsFixedVariant<V> = V extends {
  __tag: infer T;
  body: undefined;
}
  ? T extends string
    ? true
    : false
  : false;

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

export type IsParametricVariant<V> = V extends {
  __tag: infer T;
  body: infer B;
}
  ? T extends string
    ? B extends undefined
      ? false
      : true
    : false
  : false;

/**
 * Union of fixed and parametric variants.
 */
export type Variant<TAG extends string, BODY> =
  | FixedVariant<TAG>
  | ParametricVariant<TAG, BODY>;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
export type IsVariant<T> = Or<
  IsFixedVariant<T>,
  IsParametricVariant<T>
>;

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
  BODY = ExtractVariantBody<V>,
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
export type ExtractVariantBody<
  V extends Variant<string, unknown>,
> =
  V extends Variant<string, infer BODY>
    ? BODY
    : undefined;

/**
 * Extracts the tag type from a variant type.
 */
type ExtractTag<
  V extends Variant<string, unknown>,
> =
  V extends Variant<infer TAG, unknown>
    ? TAG
    : never;
