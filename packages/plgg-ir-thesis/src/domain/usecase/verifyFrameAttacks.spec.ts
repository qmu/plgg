import {
  test,
  check,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { SemDiagnostic } from "plgg-ir-language";
import {
  CompiledThesis,
  compileThesis,
} from "plgg-ir-thesis/domain/usecase/compileThesis";

/**
 * A declared target assertion (root `R`, relations
 * `r1`/`r2`) the frames below close their attacks
 * against.
 */
const T =
  "(主張 T :ロジック 因果的 :ルート (概念 R) (関係 r1 :接続元 (概念 a) :接続先 (概念 R)) (関係 r2 :接続元 (概念 b) :接続先 (概念 R)))";

/** A target assertion with a root but no relations. */
const T0 =
  "(主張 T :ロジック 因果的 :ルート (概念 R))";

/**
 * Compiles `T` + a frame declaring `attacks`
 * (`:接続先 T`).
 */
const withFrame = (attacks: string): string =>
  `${T} (フレーム F :接続元 X :接続先 T :要求 (遮断 x) ${attacks})`;

const accepts = (source: string) =>
  check(
    compileThesis(source),
    okThen((c: CompiledThesis) =>
      check(c.nodes.length >= 1, toBe(true)),
    ),
  );

const rejects = (
  source: string,
  wanted: ReadonlyArray<string>,
) =>
  check(
    compileThesis(source),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(wanted),
        ),
    ),
  );

test("valid attacks on declared targets are accepted", () =>
  accepts(
    withFrame(
      "(攻撃 s1 反駁 R) (攻撃 s2 切り崩し r1) (攻撃 s3 掘り崩し r2)",
    ),
  ));

test("an attack on an undeclared relation is a straw-man binding error", () =>
  rejects(withFrame("(攻撃 s1 掘り崩し r9)"), [
    "thesis.attack-unresolved",
  ]));

test("the straw-man diagnostic names the declared alternatives", () =>
  check(
    compileThesis(
      withFrame("(攻撃 s1 掘り崩し r9)"),
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags
            .map((d) => d.message)
            .some(
              (m) =>
                m.includes("root R") &&
                m.includes("r1 / r2"),
            ),
          toBe(true),
        ),
    ),
  ));

test("a 反駁 aimed at a relation is a type mismatch", () =>
  rejects(withFrame("(攻撃 s1 反駁 r1)"), [
    "thesis.attack-type-mismatch",
  ]));

test("a 掘り崩し aimed at the root is a type mismatch", () =>
  rejects(withFrame("(攻撃 s1 掘り崩し R)"), [
    "thesis.attack-type-mismatch",
  ]));

test("a 切り崩し aimed at the root is a type mismatch", () =>
  rejects(withFrame("(攻撃 s1 切り崩し R)"), [
    "thesis.attack-type-mismatch",
  ]));

test("a 反駁 on an undeclared target is a straw-man binding error", () =>
  rejects(withFrame("(攻撃 s1 反駁 zzz)"), [
    "thesis.attack-unresolved",
  ]));

test("a straw-man against a relationless assertion names only the root", () =>
  check(
    compileThesis(
      `${T0} (フレーム F :接続元 X :接続先 T (攻撃 s1 掘り崩し foo))`,
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags
            .map((d) => d.message)
            .some(
              (m) =>
                m.includes("root R") &&
                !m.includes("relations"),
            ),
          toBe(true),
        ),
    ),
  ));

test("a frame targeting an undeclared assertion is rejected", () =>
  rejects(
    "(フレーム F :接続元 X :接続先 ZZ (攻撃 s1 反駁 R))",
    ["thesis.unresolved-target"],
  ));
