import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  newOk,
  newErr,
  hasProp,
  pipe,
  chainResult,
  newUntaggedBox,
  flow,
} from "plgg/index";

/**
 * A variant with both a tag and body.
 */
export type Box<
  TAG extends string,
  CONTENT,
> = Readonly<{
  __tag: TAG;
  content: CONTENT;
}>;

/**
 * Type predicate to check if a type is a parametric variant.
 */
export type IsBox<V> = V extends {
  __tag: infer T;
  content: unknown;
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
): value is Box<TAG, unknown> =>
  typeof value === "object" &&
  value !== null &&
  hasProp(value, "__tag") &&
  typeof value.__tag === "string" &&
  hasProp(value, "content");

/**
 * Refinable instance for Box type guards.
 */
export const boxRefinable: Refinable<
  Box<string, unknown>
> = {
  is,
};
/**
 * Exported type guard function for Box values.
 */
export const { is: isBox } = boxRefinable;

export const asBox = (
  value: unknown,
): Result<Box<string, unknown>, InvalidError> =>
  is<string>(value)
    ? newOk(value)
    : newOk(newUntaggedBox(value));

/**
 * Castable instance for Box safe casting.
 */
export const boxCastable: Castable<
  Box<string, unknown>
> = {
  as: asBox,
};

/**
 * Type guard for Box tag existence.
 */
export const hasTag =
  <T extends string>(tag: T) =>
  (
    value: Box<string, unknown>,
  ): value is Box<T, unknown> =>
    value.__tag === tag;

/**
 * Validates and transforms the content of a Box with a specific tag using a predicate.
 */
export const forContent =
  <T extends string, U>(
    tag: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends Box<string, unknown>>(
    box: V,
  ): Result<Box<T, U>, InvalidError> =>
    hasTag(tag)(box)
      ? pipe(
          box.content,
          predicate,
          chainResult(flow(newBox(tag), newOk)),
        )
      : newErr(
          new InvalidError({
            message: `Box tag '${box.__tag}' does not match expected tag '${tag}'`,
          }),
        );

/**
 * Creates a new Box with the specified tag and content.
 */
export const newBox =
  <TAG extends string>(tag: TAG) =>
  <CONTENT>(
    content: CONTENT,
  ): Box<TAG, CONTENT> => ({
    __tag: tag,
    content,
  });

/**
 * Type guard to check if a value is a Box with a specific tag.
 */
export const isBoxWithTag =
  <T extends string>(tag: T) =>
  (value: unknown): value is Box<T, unknown> =>
    isBox(value) && hasTag(tag)(value);
