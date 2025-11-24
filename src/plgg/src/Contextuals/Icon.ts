import { Box, hasProp } from "plgg/index";

/**
 * Special placeholder value for Icon content.
 * Using a unique string to avoid conflicts with user data.
 */
export const ICON_CONTENT = "__none__" as const;

/**
 * A variant with only a tag and no body.
 */
export type Icon<TAG extends string> = Box<
  TAG,
  typeof ICON_CONTENT
>;

/**
 * Type predicate to check if a type is a fixed variant.
 */
export type IsIcon<V> = V extends {
  __tag: infer T;
  content: typeof ICON_CONTENT;
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
): value is Icon<TAG> =>
  typeof value === "object" &&
  value !== null &&
  hasProp(value, "__tag") &&
  typeof value.__tag === "string";

/**
 * Exported type guard function for Box values.
 */
export const isIcon = is;

export const hasIconTag =
  <T extends string>(tag: T) =>
  (
    value: Icon<string>,
  ): value is Icon<T> =>
    value.__tag === tag;

/**
 * Creates a new Icon with the specified tag.
 */
export const newIcon = <TAG extends string>(
  tag: TAG,
): Icon<TAG> => ({
  __tag: tag,
  content: ICON_CONTENT,
});
