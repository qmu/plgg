import {
  test,
  check,
  toBe,
  okThen,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import {
  CompiledThesis,
  compileThesis,
  normalizeThesisSource,
} from "plgg-ir-thesis/domain/usecase/compileThesis";

/** The bare canonical text of a source, or "" on failure. */
const canon = (source: string): string =>
  pipe(
    normalizeThesisSource(source),
    matchResult(
      (): string => "",
      (s: string): string => s,
    ),
  );

/** An assertion with two relations declared r1 then r2. */
const SRC_12 =
  "(主張 A :ロジック 因果的 :ルート (概念 R) (関係 r1 :接続元 (概念 a) :接続先 (概念 R)) (関係 r2 :接続元 (概念 b) :接続先 (概念 R)))";

/** The same assertion with the relations declared r2 then r1. */
const SRC_21 =
  "(主張 A :ロジック 因果的 :ルート (概念 R) (関係 r2 :接続元 (概念 b) :接続先 (概念 R)) (関係 r1 :接続元 (概念 a) :接続先 (概念 R)))";

test("normalization is idempotent (normalize ∘ normalize = normalize)", () =>
  check(canon(canon(SRC_12)), toBe(canon(SRC_12))));

test("normalization is deterministic across clause order", () =>
  check(canon(SRC_21), toBe(canon(SRC_12))));

test("a non-empty source normalizes to non-empty canonical text", () =>
  check(canon(SRC_12).length > 0, toBe(true)));

test("the versioned IR wraps the forms in (plgg-ir-thesis 1 ...)", () =>
  check(
    compileThesis(SRC_12),
    okThen((c: CompiledThesis) =>
      check(
        c.canonical.startsWith(
          "(plgg-ir-thesis 1 ",
        ),
        toBe(true),
      ),
    ),
  ));

test("the versioned IR ends with a closing paren", () =>
  check(
    compileThesis(SRC_12),
    okThen((c: CompiledThesis) =>
      check(
        c.canonical.endsWith(")"),
        toBe(true),
      ),
    ),
  ));
