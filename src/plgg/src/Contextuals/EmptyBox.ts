import { Box, hasProp } from "plgg/index";

/**
 * A variant with only a tag and no body.
 */
export type EmptyBox<TAG extends string> = Box<
  TAG,
  undefined
>;

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
 * Type guard to check if a value is a Box.
 */
const is = <TAG extends string>(
  value: unknown,
): value is EmptyBox<TAG> =>
  typeof value === "object" &&
  value !== null &&
  hasProp(value, "__tag") &&
  typeof value.__tag === "string";

/**
 * Exported type guard function for Box values.
 */
export const isEmptyBox = is;

export const hasEmptyBoxTag =
  <T extends string>(tag: T) =>
  (
    value: EmptyBox<string>,
  ): value is EmptyBox<T> =>
    value.__tag === tag;

/**
 * Creates a new EmptyBox with the specified tag.
 */
export const newEmptyBox = <TAG extends string>(
  tag: TAG,
): EmptyBox<TAG> => ({
  __tag: tag,
  content: undefined,
});
