import {
  Result,
  ok,
  err,
  isOk,
  isErr,
} from "plgg/index";

export const collectResults = <T, E>(
  results: ReadonlyArray<Result<T, E>>,
): Result<Array<T>, Array<E>> => {
  const errors = results.filter((result) =>
    isErr(result),
  );
  return errors.length > 0
    ? err(errors.map((error) => error.content))
    : ok(
        results
          .filter((result) => isOk(result))
          .map((value) => value.content),
      );
};
