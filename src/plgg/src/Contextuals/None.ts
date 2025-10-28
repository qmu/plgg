import {
  EmptyBox,
  Result,
  InvalidError,
  Refinable,
  Castable,
  pattern,
  isEmptyBox,
  hasEmptyBoxTag,
  newOk,
  newErr,
  newEmptyBox,
} from "plgg/index";

/**
 * Tag which represents the None variant of Option.
 */
const noneTag = "None" as const;

/**
 * None side of Option, representing the absence of a value.
 * Equivalent to null/undefined but in a type-safe way.
 */
export type None = EmptyBox<typeof noneTag>;

/**
 * Pattern constructor for None matching.
 * Used in pattern matching to match None values.
 */
export const none = () => pattern(noneTag)();

/**
 * Creates a None instance representing no value.
 */
export const newNone = (): None =>
  newEmptyBox(noneTag);

/**
 * Type guard to check if an Option is a None.
 */
const is = (e: unknown): e is None =>
  isEmptyBox(e) && hasEmptyBoxTag(noneTag)(e);

/**
 * Refinable instance for None type guards.
 */
export const noneRefinable: Refinable<None> = {
  is,
};
/**
 * Exported type guard function for None values.
 */
export const { is: isNone } = noneRefinable;

/**
 * Castable instance for None safe casting.
 */
export const noneCastable: Castable<None> = {
  as: (
    value: unknown,
  ): Result<None, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a None",
          }),
        ),
};
/**
 * Exported safe casting function for None values.
 */
export const { as: asNone } = noneCastable;
