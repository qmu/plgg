import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type VectorRow,
  cosineSimilarity,
  topK,
} from "./rag.js";

test("cosine agrees with hand values", () =>
  all([
    check(
      cosineSimilarity([1, 0], [1, 0]),
      toBe(1),
    ),
    check(
      cosineSimilarity([1, 0], [0, 1]),
      toBe(0),
    ),
    check(
      cosineSimilarity([1, 0], [-1, 0]),
      toBe(-1),
    ),
  ]));

test("cosine is total on malformed input", () =>
  all([
    // dimension mismatch → 0, never a throw
    check(
      cosineSimilarity([1, 0], [1]),
      toBe(0),
    ),
    check(cosineSimilarity([], []), toBe(0)),
    // zero magnitude → 0
    check(
      cosineSimilarity([0, 0], [1, 1]),
      toBe(0),
    ),
  ]));

const rows: ReadonlyArray<VectorRow> = [
  [0, [1, 0]],
  [1, [0.9, 0.1]],
  [2, [0, 1]],
];

test("topK ranks by similarity, best first", () =>
  all([
    check(
      topK([1, 0], rows, 2).map((s) => s.id),
      toEqual([0, 1]),
    ),
    check(
      topK([0, 1], rows, 1).map((s) => s.id),
      toEqual([2]),
    ),
    check(topK([1, 0], rows, 0), toEqual([])),
    check(
      topK([1, 0], [], 3),
      toEqual([]),
    ),
  ]));
