import { isObj, hasProp, Or } from "plgg/index";

/**
 * A variant with both a tag and body.
 */
export type Box<TAG extends string, CONTENT> = {
  __tag: TAG;
  content: CONTENT;
};

/**
 * Type predicate to check if a type is a parametric variant.
 */
export type IsBox<V> = V extends {
  __tag: infer T;
  content: infer B;
}
  ? T extends string
    ? B extends undefined
      ? false
      : true
    : false
  : false;

/**
 * A variant with only a tag and no body.
 */
export type EmptyBox<TAG extends string> = {
  __tag: TAG;
  content: undefined;
};

/**
 * Type predicate to check if a type is a fixed variant.
 */
export type IsEmptyBox<V> = V extends {
  __tag: infer T;
  content: undefined;
}
  ? T extends string
    ? true
    : false
  : false;

/**
 * Union of fixed and parametric variants.
 */
export type BoxLike<
  TAG extends string,
  CONTENT,
> = Box<TAG, CONTENT> | EmptyBox<TAG>;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
export type IsBoxLike<T> = Or<
  IsBox<T>,
  IsEmptyBox<T>
>;

/**
 * Type guard to check if a value is any variant.
 */
export const isBoxLike = (
  v: unknown,
): v is BoxLike<string, unknown> =>
  isObj(v) &&
  hasProp(v, "__tag") &&
  hasProp(v, "content");

/**
 * Creates a type guard to check if a variant has a specific tag.
 */
export const hasTag =
  <TAG extends string>(tag: TAG) =>
  <T>(v: unknown): v is BoxLike<TAG, T> =>
    isObj(v) &&
    hasProp(v, "__tag") &&
    v.__tag === tag;

/**
 * Creates a variant constructor for a specific tag.
 */
export function construct<
  V extends BoxLike<string, unknown>,
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
  V extends BoxLike<string, unknown>,
> =
  V extends BoxLike<string, infer CONTENT>
    ? CONTENT
    : undefined;

/**
 * Extracts the tag type from a variant type.
 */
export type ExtractTag<
  V extends BoxLike<string, unknown>,
> =
  V extends BoxLike<infer TAG, unknown>
    ? TAG
    : never;
