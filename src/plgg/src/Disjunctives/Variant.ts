import { isObj, hasProp } from "plgg/index";

/**
 * A variant with only a tag and no content.
 */
export type FixedVariant<TAG extends string> = {
  __tag: TAG;
};

/**
 * A variant with both a tag and content.
 */
export type ParametricVariant<TAG extends string, CONTENT> = {
  __tag: TAG;
  content: CONTENT;
};

/**
 * Union of fixed and parametric variants.
 */
export type Variant<TAG extends string, CONTENT> =
  | FixedVariant<TAG>
  | ParametricVariant<TAG, CONTENT>;

/**
 * Type guard to check if a value is any variant.
 */
export const isVariant = (v: unknown): v is Variant<string, unknown> =>
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
 * TODO: Content extractor for parametric variants.
 * Will provide safe extraction of content from variants.
 */
export const withContent = () => {};

/**
 * Creates a variant constructor for a specific tag.
 */
export function variantMaker<TAG extends string>(__tag: TAG) {
  return function <
    V extends Variant<string, unknown>,
    CONTENT = ExtractContent<V>,
  >() {
    function maker(): FixedVariant<TAG>;
    function maker(content: CONTENT): ParametricVariant<TAG, CONTENT>;
    function maker(
      content?: CONTENT,
    ): FixedVariant<TAG> | ParametricVariant<TAG, CONTENT> {
      return content === undefined
        ? ({ __tag } as const)
        : ({ __tag, content } as const);
    }
    return maker;
  };
}

/**
 * Creates a pattern constructor for matching variants.
 */
export function pattern<TAG extends string>(__tag: TAG) {
  return function <
    V extends Variant<string, unknown>,
    CONTENT = ExtractContent<V>,
    PCONTENT = Partial<CONTENT>,
  >() {
    function maker(): FixedVariant<TAG>;
    function maker(content: PCONTENT): ParametricVariant<TAG, PCONTENT>;
    function maker(
      content?: PCONTENT,
    ): FixedVariant<TAG> | ParametricVariant<TAG, PCONTENT> {
      return content === undefined
        ? ({ __tag } as const)
        : ({ __tag, content } as const);
    }
    return maker;
  };
}

/**
 * Extracts the content type from a variant type.
 */
export type ExtractContent<V extends Variant<string, unknown>> =
  V extends Variant<string, infer CONTENT> ? CONTENT : never;
