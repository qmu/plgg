import { isObj, hasProp, Or } from "plgg/index";

/**
 * A variant with only a tag and no body.
 */
export type FixedVariant<TAG extends string> = {
  __tag: TAG;
  body: undefined;
};

/**
 * Type predicate to check if a type is a fixed variant.
 */
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
export type Variant<TAG extends string, BODY> = {
  __tag: TAG;
  body: BODY;
};

/**
 * Type predicate to check if a type is a parametric variant.
 */
export type IsVariant<V> = V extends {
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
export type VariantLike<
  TAG extends string,
  BODY,
> = FixedVariant<TAG> | Variant<TAG, BODY>;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
export type IsVariantLike<T> = Or<
  IsFixedVariant<T>,
  IsVariant<T>
>;

/**
 * Type guard to check if a value is any variant.
 */
export const isVariantLike = (
  v: unknown,
): v is VariantLike<string, unknown> =>
  isObj(v) &&
  hasProp(v, "__tag") &&
  hasProp(v, "body");

/**
 * Creates a type guard to check if a variant has a specific tag.
 */
export const hasTag =
  <TAG extends string>(tag: TAG) =>
  <T>(v: unknown): v is VariantLike<TAG, T> =>
    isVariantLike(v) && v.__tag === tag;

/**
 * Creates a variant constructor for a specific tag.
 */
export function construct<
  V extends VariantLike<string, unknown>,
  TAG extends string = ExtractTag<V>,
  BODY = ExtractVariantBody<V>,
>(__tag: TAG) {
  function maker(): FixedVariant<TAG>;
  function maker(body: BODY): Variant<TAG, BODY>;
  function maker(
    body?: BODY,
  ): FixedVariant<TAG> | Variant<TAG, BODY> {
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
  V extends VariantLike<string, unknown>,
> =
  V extends VariantLike<string, infer BODY>
    ? BODY
    : undefined;

/**
 * Extracts the tag type from a variant type.
 */
export type ExtractTag<
  V extends VariantLike<string, unknown>,
> =
  V extends VariantLike<infer TAG, unknown>
    ? TAG
    : never;
