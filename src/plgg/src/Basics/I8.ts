import {
  Result,
  InvalidError,
  Refinable1,
  Castable1,
  newOk,
  newErr,
  pipe,
  chainResult,
  isBox,
  hasTag,
  isNum,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    I8: I8<string, A extends number ? A : never>;
  }
}

/**
 * A variant with both a tag and content that must be an 8-bit signed integer (-128 to 127).
 */
export type I8<
  TAG extends string,
  CONTENT extends number,
> = {
  __tag: TAG;
  content: CONTENT;
};

/**
 * Type guard to check if a value is an I8.
 */
const is = <
  TAG extends string,
  CONTENT extends number,
>(
  value: unknown,
): value is I8<TAG, CONTENT> =>
  isBox(value) &&
  hasTag("I8")(value) &&
  isNum(value.content) &&
  Number.isInteger(value.content) &&
  value.content >= -128 &&
  value.content <= 127;

/**
 * Refinable instance for I8 type guards.
 */
export const i8Refinable: Refinable1<"I8"> = {
  KindKey: "I8",
  is,
};
/**
 * Exported type guard function for I8 values.
 */
export const { is: isI8 } = i8Refinable;

/**
 * Castable instance for I8 safe casting.
 */
export const i8Castable: Castable1<"I8"> = {
  KindKey: "I8",
  as: <A extends number>(
    value: unknown,
  ): Result<I8<string, A>, InvalidError> =>
    is<string, A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not an I8 (tag-content pair with integer -128 to 127)",
          }),
        ),
};
/**
 * Exported safe casting function for I8 values.
 */
export const { as: asI8 } = i8Castable;

/**
 * Validates and transforms the content of an I8 with a specific tag using a predicate.
 */
export const forContent =
  <T extends string, U extends number>(
    tag: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends I8<string, number>>(
    i8: V,
  ): Result<I8<T, U>, InvalidError> =>
    i8.__tag === tag
      ? pipe(
          i8.content,
          predicate,
          chainResult(
            (
              okValue,
            ): Result<I8<T, U>, InvalidError> =>
              newOk({
                __tag: tag,
                content: okValue,
              }),
          ),
        )
      : newErr(
          new InvalidError({
            message: `I8 tag '${i8.__tag}' does not match expected tag '${tag}'`,
          }),
        );
