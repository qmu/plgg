import { test, check, all, toBe } from "plgg-test";
import { isVecLike } from "plgg/index";

test("isVecLike returns true for arrays", () => {
  const mut: number[] = [];
  mut.push(1);
  return all([
    check(isVecLike([]), toBe(true)),
    check(isVecLike([1, 2, 3]), toBe(true)),
    check(isVecLike(["a"]), toBe(true)),
    check(isVecLike(mut), toBe(true)),
  ]);
});

test("isVecLike returns false for non-vector values", () =>
  all([
    check(isVecLike(null), toBe(false)),
    check(isVecLike(undefined), toBe(false)),
    check(isVecLike({}), toBe(false)),
    check(isVecLike("string"), toBe(false)),
    check(isVecLike(42), toBe(false)),
    check(isVecLike(true), toBe(false)),
    check(isVecLike(0n), toBe(false)),
  ]));
