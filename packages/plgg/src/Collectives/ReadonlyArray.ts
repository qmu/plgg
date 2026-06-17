import {
  Result,
  InvalidError,
  invalidError,
  Refinable,
  ok,
  err,
  isOk,
} from "plgg/index";

/**
 * Represents JavaScript readonly array values.
 */
export type ReadonlyArr<T = unknown> =
  ReadonlyArray<T>;

/**
 * Type guard to check if a value is a ReadonlyArray.
 */
const is = (
  value: unknown,
): value is ReadonlyArr => Array.isArray(value);

/**
 * Refinable instance for readonly array type guards.
 */
export const readonlyArrayRefinable: Refinable<ReadonlyArr> =
  {
    is,
  };
/**
 * Exported type guard function for readonly array values.
 */
export const { is: isReadonlyArray } =
  readonlyArrayRefinable;

/**
 * Creates a casting function for readonly arrays with element validation.
 * Takes an element casting function and returns a function that validates
 * each element of the array.
 */
export const asReadonlyArray =
  <T>(
    elementCast: (
      value: unknown,
    ) => Result<T, InvalidError>,
  ) =>
  (
    value: unknown,
  ): Result<ReadonlyArr<T>, InvalidError> => {
    if (!is(value)) {
      return err(
        invalidError({
          message: "Value is not an array",
        }),
      );
    }

    const results: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const a = value[i];
      if (a === undefined || a === null) {
        return err(
          invalidError({
            message: `Array element at index ${i} is undefined`,
          }),
        );
      }
      const result = elementCast(a);
      if (isOk(result)) {
        results.push(result.content);
      } else {
        return err(
          invalidError({
            message: `Array element at index ${i} failed validation: ${result.content.content.message}`,
            sibling: [result.content],
          }),
        );
      }
    }

    return ok(results);
  };
