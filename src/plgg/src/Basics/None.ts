import {
  FixedVariant,
  hasTag,
  construct,
  Result,
  ok,
  err,
  InvalidError,
  Refinement,
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
 * Refinement instance for None validation and casting.
 * Provides type-safe None validation following the standard Refinement pattern.
 */
export const noneRefinement: Refinement<None> = {
  is,
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
export const { is: isNone, as: asNone } =
  noneRefinement;

