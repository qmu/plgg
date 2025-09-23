import {
  Result,
  InvalidError,
  Refinable1,
  Castable1,
  newOk,
  newErr,
  isBox,
  hasTag,
  isNum,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    I8: I8<A extends number ? A : never>;
  }
}

/**
 * A variant with both a tag and content that must be an 8-bit signed integer (-128 to 127).
 */
export type I8<CONTENT extends number> = {
  __tag: "I8";
  content: CONTENT;
};

/**
 * Type guard to check if a value is an I8.
 */
const is = <CONTENT extends number>(
  value: unknown,
): value is I8<CONTENT> =>
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
  ): Result<I8<A>, InvalidError> =>
    is<A>(value)
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
