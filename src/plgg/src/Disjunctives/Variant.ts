import { isObj, hasProp } from "plgg/index";

/**
 * A variant with only a tag and no content.
 * Used for simple enumeration values.
 * 
 * @template TAG - String literal tag type
 */
export type FixedVariant<TAG extends string> = {
  __tag: TAG;
};

/**
 * A variant with both a tag and content.
 * Used for values that carry data.
 * 
 * @template TAG - String literal tag type
 * @template CONTENT - Type of the content
 */
export type ParametricVariant<TAG extends string, CONTENT> = {
  __tag: TAG;
  content: CONTENT;
};

/**
 * Union of fixed and parametric variants.
 * Represents a tagged union that may or may not carry data.
 * 
 * @template TAG - String literal tag type
 * @template CONTENT - Type of the content (if any)
 */
export type Variant<TAG extends string, CONTENT> =
  | FixedVariant<TAG>
  | ParametricVariant<TAG, CONTENT>;

/**
 * Type guard to check if a value is any variant.
 * 
 * @param v - Value to check
 * @returns True if the value has a __tag property
 */
export const isVariant = (v: unknown): v is Variant<string, unknown> =>
  isObj(v) && hasProp(v, "__tag");

/**
 * Creates a type guard to check if a variant has a specific tag.
 * 
 * @param tag - The tag to check for
 * @returns Type guard function for variants with the specified tag
 * @example
 * const isSome = hasTag("Some");
 * if (isSome(value)) {
 *   // TypeScript knows value has tag "Some"
 * }
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
 * Returns a function that can create both fixed and parametric variants.
 * 
 * @param __tag - The tag string for this variant
 * @returns Function that creates variant instances
 * @example
 * const makeSuccess = variantMaker("Success")<SuccessVariant>();
 * const success1 = makeSuccess(); // Fixed variant
 * const success2 = makeSuccess({ data: "hello" }); // Parametric variant
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
 * Similar to variantMaker but allows partial content for pattern matching.
 * 
 * @param __tag - The tag string for this pattern
 * @returns Function that creates pattern instances for matching
 * @example
 * const matchUser = pattern("User")<UserVariant>();
 * const userPattern = matchUser({ name: "John" }); // Partial match
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
 * 
 * @template V - Variant type to extract content from
 * @example
 * type UserContent = ExtractContent<User>; // { name: string; age: number }
 */
export type ExtractContent<V extends Variant<string, unknown>> =
  V extends Variant<string, infer CONTENT> ? CONTENT : never;
