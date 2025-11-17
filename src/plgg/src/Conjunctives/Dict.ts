import {
  Obj,
  Datum,
  Result,
  InvalidError,
  newOk,
  newErr,
  isErr,
} from "plgg/index";

export type Dict<
  T extends string = string,
  U extends Datum = Datum,
> = Obj<Record<T, U>>;

/**
 * Creates a casting function for validating objects with value type validation.
 * This can be composed with other casting functions in the cast pipeline.
 *
 * @example
 * forOptionProp("config", asDictOf(asStr))
 */
export const asDictOf =
  <T extends Datum>(
    asFn: (
      value: unknown,
    ) => Result<T, InvalidError>,
  ) =>
  (
    value: unknown,
  ): Result<Dict<string, T>, InvalidError> => {
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      return newErr(
        new InvalidError({
          message: "Value is not a dictionary",
        }),
      );
    }

    const result: Record<string, T> = {};
    for (const key in value) {
      if (
        Object.prototype.hasOwnProperty.call(
          value,
          key,
        )
      ) {
        const elementResult = asFn(
          (value as Record<string, unknown>)[key],
        );
        if (isErr(elementResult)) {
          return newErr(
            new InvalidError({
              message: `Invalid value at key "${key}": ${elementResult.content.message}`,
            }),
          );
        }
        result[key] = elementResult.content;
      }
    }

    return newOk(result);
  };
