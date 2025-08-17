import { isObj, hasProp } from "plgg/index";

/**
 * A variant with only a tag and no body.
 */
export type FixedVariant<TAG extends string> = {
  __tag: TAG;
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

/**
 * Type guard to check if a value is any variant.
 */
export const isVariant = (
  v: unknown,
): v is Variant<string, unknown> =>
  isObj(v) && hasProp(v, "__tag");

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
      ? ({ __tag } as const)
      : ({ __tag, body: body } as const);
  }
  return maker;
}

/**
 * Creates a pattern constructor for matching variants.
 */
export function pattern<
  V extends Variant<string, unknown>,
  TAG extends string = ExtractTag<V>,
  BODY = ExtractBody<V>,
  PBODY = Partial<BODY>,
>(__tag: TAG) {
  function maker(): ParametricVariant<TAG, PBODY>;
  function maker(
    body?: PBODY,
  ): ParametricVariant<TAG, PBODY>;
  function maker(
    body?: PBODY,
  ):
    | FixedVariant<TAG>
    | ParametricVariant<TAG, PBODY> {
    return body === undefined
      ? ({ __tag } as const)
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
    : never;

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
