import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isOk,
  isErr,
} from "plgg";
import {
  serializeEmbedding,
  deserializeEmbedding,
} from "plgg-cms/content/Rag/model/Embedding";
import {
  cosineSimilarity,
  topK,
} from "plgg-cms/content/Rag/usecase/similarity";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error("expected ok");
  }
  return r.content;
};

const near = (x: number, target: number): boolean =>
  Math.abs(x - target) < 1e-6;

test("embedding serialize/deserialize round-trips", () => {
  const e = [0.1, -0.2, 0.3];
  const round = must(
    deserializeEmbedding(serializeEmbedding(e)),
  );
  return all([
    check(round.length, toBe(3)),
    check(round[0] ?? 0, toBe(0.1)),
    check(round[2] ?? 0, toBe(0.3)),
  ]);
});

test("deserialize fails closed on bad input", () =>
  all([
    check(isErr(deserializeEmbedding(5)), toBe(true)),
    check(
      isErr(deserializeEmbedding("not json")),
      toBe(true),
    ),
    check(
      isErr(deserializeEmbedding("{\"a\":1}")),
      toBe(true),
    ),
    check(
      isErr(
        deserializeEmbedding("[1, \"x\", 3]"),
      ),
      toBe(true),
    ),
    check(
      isErr(deserializeEmbedding("[1, null]")),
      toBe(true),
    ),
    check(
      // JSON 1e400 parses to Infinity — rejected as non-finite
      isErr(deserializeEmbedding("[1e400]")),
      toBe(true),
    ),
    check(
      isOk(deserializeEmbedding("[]")),
      toBe(true),
    ),
  ]));

test("cosine similarity: identical=1, orthogonal=0, mismatch=0, zero=0", () =>
  all([
    check(
      near(cosineSimilarity([1, 0], [1, 0]), 1),
      toBe(true),
    ),
    check(
      near(cosineSimilarity([1, 0], [0, 1]), 0),
      toBe(true),
    ),
    check(
      cosineSimilarity([1, 0, 0], [1, 0]),
      toBe(0),
    ),
    check(
      cosineSimilarity([0, 0], [1, 1]),
      toBe(0),
    ),
    check(cosineSimilarity([], []), toBe(0)),
  ]));

test("topK ranks by cosine and honours k", () => {
  const q = [1, 0];
  const cands = [
    { id: "a", embedding: [0, 1] },
    { id: "b", embedding: [1, 0] },
    { id: "c", embedding: [0.7, 0.7] },
  ];
  const top2 = topK(q, cands, 2);
  return all([
    check(top2.length, toBe(2)),
    check(top2[0]?.id ?? "", toBe("b")),
    check(top2[1]?.id ?? "", toBe("c")),
    check(topK(q, cands, 0).length, toBe(0)),
    check(topK(q, [], 5).length, toBe(0)),
  ]);
});
