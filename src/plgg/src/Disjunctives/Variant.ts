import {
  Or,
  Box,
  EmptyBox,
  IsBox,
  IsEmptyBox,
  isObj,
  hasProp,
} from "plgg/index";

/**
 * Union of fixed and parametric variants.
 */
export type Variant<
  TAG extends string,
  CONTENT,
> = Box<TAG, CONTENT> | EmptyBox<TAG>;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
export type IsVariant<T> = Or<
  IsBox<T>,
  IsEmptyBox<T>
>;

/**
 * Type guard to check if a value is any variant.
 */
export const isVariant = (
  v: unknown,
): v is Variant<string, unknown> =>
  isObj(v) &&
  hasProp(v, "__tag") &&
  hasProp(v, "content");

/**
 * Creates a variant constructor for a specific tag.
 */
export function construct<
  V extends Variant<string, unknown>,
  TAG extends string = ExtractTag<V>,
  CONTENT = ExtractBoxContent<V>,
>(__tag: TAG) {
  function maker(): EmptyBox<TAG>;
  function maker(
    content: CONTENT,
  ): Box<TAG, CONTENT>;
  function maker(
    content?: CONTENT,
  ): EmptyBox<TAG> | Box<TAG, CONTENT> {
    return content === undefined
      ? ({ __tag, content: undefined } as const)
      : ({ __tag, content } as const);
  }
  return maker;
}

/**
 * Extracts the body type from a variant type.
 */
export type ExtractBoxContent<
  V extends Variant<string, unknown>,
> =
  V extends Variant<string, infer CONTENT>
    ? CONTENT
    : undefined;

/**
 * Extracts the tag type from a variant type.
 */
export type ExtractTag<
  V extends Variant<string, unknown>,
> =
  V extends Variant<infer TAG, unknown>
    ? TAG
    : never;
