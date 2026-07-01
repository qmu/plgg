import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  compare,
  comparing,
  sortBy,
} from "plgg/index";

test("compare orders strings", () =>
  all([
    check(compare("a", "b"), toBe(-1)),
    check(compare("b", "a"), toBe(1)),
    check(compare("a", "a"), toBe(0)),
  ]));

test("compare orders numbers", () =>
  all([
    check(compare(1, 2), toBe(-1)),
    check(compare(2, 1), toBe(1)),
    check(compare(2, 2), toBe(0)),
  ]));

test("compare orders bigints", () =>
  all([
    check(compare(1n, 2n), toBe(-1)),
    check(compare(2n, 1n), toBe(1)),
    check(compare(2n, 2n), toBe(0)),
  ]));

test("comparing projects to a key", () => {
  const cmp = comparing<{ n: number }, number>(
    (x) => x.n,
  );
  return all([
    check(cmp({ n: 1 }, { n: 2 }), toBe(-1)),
    check(cmp({ n: 2 }, { n: 2 }), toBe(0)),
    check(cmp({ n: 3 }, { n: 2 }), toBe(1)),
  ]);
});

test("sortBy does not mutate its input", () => {
  const xs = [3, 1, 2];
  const sorted = sortBy<number>(compare)(xs);
  return all([
    check(sorted, toEqual([1, 2, 3])),
    check(xs, toEqual([3, 1, 2])),
  ]);
});

test("sortBy keeps equal elements", () => {
  const sorted = sortBy<number>(compare)([
    2, 1, 2, 1,
  ]);
  return check(sorted, toEqual([1, 1, 2, 2]));
});
