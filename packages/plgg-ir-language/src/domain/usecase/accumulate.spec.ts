import {
  test,
  check,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { Result, ok, err } from "plgg";
import {
  partitionResults,
  allOrErrors,
} from "plgg-ir-language/domain/usecase/accumulate";

const mixed: ReadonlyArray<
  Result<number, ReadonlyArray<string>>
> = [ok(1), err(["a", "b"]), ok(2), err(["c"])];

test("partitionResults splits errors and values", () =>
  check(
    partitionResults(mixed),
    toEqual({
      errors: ["a", "b", "c"],
      values: [1, 2],
    }),
  ));

test("allOrErrors yields every value when nothing failed", () =>
  check(
    allOrErrors<number, string>([ok(1), ok(2)]),
    okThen((values) =>
      check(values, toEqual([1, 2])),
    ),
  ));

test("allOrErrors yields every error together", () =>
  check(
    allOrErrors(mixed),
    errThen((errors: ReadonlyArray<string>) =>
      check(errors, toEqual(["a", "b", "c"])),
    ),
  ));

test("allOrErrors of nothing is an empty success", () =>
  check(
    allOrErrors<number, string>([]),
    okThen((values) =>
      check(values, toEqual([])),
    ),
  ));
