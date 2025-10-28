import {
  Result,
  InvalidError,
  Refinable,
  newOk,
  newErr,
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
  <T, A>(
    elementCast: (
      value: A,
    ) => Result<T, InvalidError>,
  ) =>
  (
    value: ReadonlyArray<A>,
  ): Result<ReadonlyArr<T>, InvalidError> => {
    if (!is(value)) {
      return newErr(
        new InvalidError({
          message: "Value is not an array",
        }),
      );
    }

    const results: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const a = value[i];
      if (a === undefined) {
        return newErr(
          new InvalidError({
            message: `Array element at index ${i} is undefined`,
          }),
        );
      }
      const result = elementCast(a);
      if (isOk(result)) {
        results.push(result.content);
      } else {
        return newErr(
          new InvalidError({
            message: `Array element at index ${i} failed validation: ${result.content.message}`,
            parent: result.content,
          }),
        );
      }
    }

    return newOk(results);
  };
