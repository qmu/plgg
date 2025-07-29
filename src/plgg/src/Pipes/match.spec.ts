import { test, expect } from "vitest";
import { pipe, match } from "plgg/index";

test("number1", async () => {
  const r1 = pipe(
    3, // Should compile error when 4
    match(
      [1 as const, () => "1"],
      [2 as const, () => "2"],
      [3 as const, () => "3"],
    ),
  );
  expect(r1).equal("3");
});

test("number2", async () => {
  const status1 = 1 as const,
    status2 = 2 as const,
    status3 = 3 as const;
  type status = typeof status1 | typeof status2 | typeof status3;
  const a1: status = 3;
  // prettier-ignore
  const r2 = pipe(
    a1, 
    match(
      [status1, () => "1"], 
      [status2, () => "2"],  // should compile error when erased
      [status3, () => "3"]
    ));
  expect(r2).equal("3");
});
