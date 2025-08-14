import {
  FixedVariant,
  hasTag,
  construct,
  Result,
  ok,
  err,
  InvalidError,
  Refinable0,
  Castable0,
  pattern,
} from "plgg/index";

/**
 * Tag which represents the None variant of Option.
 */
const noneTag = "None" as const;

/**
 * None side of Option, representing the absence of a value.
 * Equivalent to null/undefined but in a type-safe way.
 */
export type None = FixedVariant<typeof noneTag>;

/**
 * Pattern constructor for None matching.
 * Used in pattern matching to match None values.
 */
export const None = () =>
  pattern<None>(noneTag)();

/**
 * Creates a None instance representing no value.
 */
export const none = (): None =>
  construct<None>(noneTag)();

/**
 * Type guard to check if an Option is a None.
 */
const is = (e: unknown): e is None =>
  hasTag(noneTag)(e);

/**
 * Refinable instance for None type guards.
 */
export const noneRefinable: Refinable0<None> = {
  is,
};
export const { is: isNone } = noneRefinable;

/**
 * Castable instance for None safe casting.
 */
export const noneCastable: Castable0<None> = {
  as: (
    value: unknown,
  ): Result<None, InvalidError> =>
    is(value)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Value is not a None",
          }),
        ),
};
export const { as: asNone } = noneCastable;
