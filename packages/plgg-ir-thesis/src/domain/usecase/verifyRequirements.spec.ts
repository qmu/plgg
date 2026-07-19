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

const rejectsNaming = (
  source: string,
  needle: string,
) =>
  check(
    compileThesis(source),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags
            .map((d) => d.message)
            .some((m) => m.includes(needle)),
          toBe(true),
        ),
    ),
  );

// ── the 撤退論 / 継続論 reference example (design.md §4) ──

/** The target assertion 撤退論, root 撤退判断, edges r1/r2/r3. */
const TAI =
  "(主張 撤退論 :ロジック 因果的 :ルート (概念 撤退判断) (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減)) (関係 r2 :接続元 (概念 売上減) :接続先 (概念 撤退判断)) (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))";

/** A 反論 frame over 撤退論 with `mode` requirement and `attacks`. */
const frame = (mode: string, attacks: string): string =>
  `${TAI} (フレーム 継続論による反論 :種別 反論 :接続元 継続論 :接続先 撤退論 :要求 ${mode} ${attacks})`;

/** The complete attack set (every relation attacked). */
const ALL =
  "(攻撃 s1 掘り崩し r1) (攻撃 s2 切り崩し r2) (攻撃 s3 掘り崩し r3)";

/** The attack set with s3 removed. */
const NO_S3 =
  "(攻撃 s1 掘り崩し r1) (攻撃 s2 切り崩し r2)";

test("被覆 accepts when every relation is attacked", () =>
  accepts(frame("(被覆 関係)", ALL)));

test("被覆 rejects an unattacked relation naming it", () =>
  rejects(frame("(被覆 関係)", NO_S3), [
    "thesis.coverage-gap",
  ]));

test("the 被覆 counterexample names the unattacked r3", () =>
  rejectsNaming(
    frame("(被覆 関係)", NO_S3),
    "unattacked r3",
  ));

test("遮断 accepts when the attacked set cuts every path", () =>
  accepts(frame("(遮断 前提→ルート)", ALL)));

test("遮断 rejects a surviving path naming it", () =>
  rejects(frame("(遮断 前提→ルート)", NO_S3), [
    "thesis.severing-survives",
  ]));

test("the 遮断 counterexample names the surviving 競合参入 →r3→ 撤退判断", () =>
  rejectsNaming(
    frame("(遮断 前提→ルート)", NO_S3),
    "競合参入 →r3→ 撤退判断",
  ));

test("an unknown :要求 mode is a bad requirement", () =>
  rejects(
    `${TAI} (フレーム F :接続元 X :接続先 撤退論 :要求 (謎 1))`,
    ["thesis.bad-requirement"],
  ));

test("a non-list :要求 is a bad requirement", () =>
  rejects(
    `${TAI} (フレーム F :接続元 X :接続先 撤退論 :要求 x)`,
    ["thesis.bad-requirement"],
  ));

test("被覆 over an undeclared target defers to the target check", () =>
  rejects(
    `(フレーム F :接続元 X :接続先 UNDECL :要求 (被覆 関係) (攻撃 s1 反駁 r))`,
    ["thesis.unresolved-target"],
  ));

test("遮断 over an undeclared target defers to the target check", () =>
  rejects(
    `(フレーム F :接続元 X :接続先 UNDECL :要求 (遮断 x) (攻撃 s1 反駁 r))`,
    ["thesis.unresolved-target"],
  ));

// ── circular reasoning (依存) ───────────────────────────

/** Three assertions plus a chaining pair of 依存 frames A→B→C. */
const DEPS =
  "(主張 A :ロジック 因果的 :ルート (概念 xa)) (主張 B :ロジック 因果的 :ルート (概念 xb)) (主張 C :ロジック 因果的 :ルート (概念 xc)) (フレーム d1 :種別 依存 :接続元 A :接続先 B) (フレーム d2 :種別 依存 :接続元 B :接続先 C)";

test("an acyclic 依存 graph is accepted", () =>
  accepts(DEPS));

test("a 依存 cycle is rejected as circular reasoning", () =>
  rejects(
    `${DEPS} (フレーム d3 :種別 依存 :接続元 C :接続先 A)`,
    ["thesis.circular-reasoning"],
  ));

test("the circular-reasoning counterexample names the cycle", () =>
  rejectsNaming(
    `${DEPS} (フレーム d3 :種別 依存 :接続元 C :接続先 A)`,
    "A → B → C → A",
  ));

// ── intra-stance contradiction ──────────────────────────

/** Two assertions; `sp`/`sq` are their stances. */
const stances = (sp: string, sq: string): string =>
  `(主張 P :ロジック 因果的 :立場 ${sp} :ルート (概念 xp)) (主張 Q :ロジック 因果的 :立場 ${sq} :ルート (概念 xq)) (フレーム clash :種別 反論 :接続元 P :接続先 Q (攻撃 a1 反駁 xq))`;

test("a 反論 across two stances is accepted (surfaced, not rejected)", () =>
  accepts(stances("保守", "革新")));

test("a 反論 within one stance is an intra-stance contradiction", () =>
  rejects(stances("保守", "保守"), [
    "thesis.stance-contradiction",
  ]));

test("the stance-contradiction counterexample names both assertions", () =>
  rejectsNaming(stances("保守", "保守"), "P and Q"));

// ── blind-spot (多面性 n) ───────────────────────────────

/** Two stances that both reach 共通 and 論点. */
const COVERED =
  "(主張 A :ロジック 因果的 :立場 楽観 :ルート (概念 共通) (関係 e1 :接続元 (概念 共通) :接続先 (概念 論点))) (主張 B :ロジック 因果的 :立場 悲観 :ルート (概念 共通) (関係 e2 :接続元 (概念 共通) :接続先 (概念 論点)))";

/** As COVERED, but B alone introduces 個B. */
const BLIND =
  "(主張 A :ロジック 因果的 :立場 楽観 :ルート (概念 共通) (関係 e1 :接続元 (概念 共通) :接続先 (概念 論点))) (主張 B :ロジック 因果的 :立場 悲観 :ルート (概念 共通) (関係 e2 :接続元 (概念 共通) :接続先 (概念 論点)) (概念 個B))";

/** A 多面性 frame requesting threshold `n`. */
const perspectivity = (
  body: string,
  n: string,
): string =>
  `${body} (フレーム bs :種別 多面性 :接続元 A :接続先 A :要求 (多面性 ${n}))`;

test("多面性 accepts when every concept is reached from n stances", () =>
  accepts(perspectivity(COVERED, "2")));

test("多面性 rejects a concept seen from too few stances", () =>
  rejects(perspectivity(BLIND, "2"), [
    "thesis.perspectivity-gap",
  ]));

test("the blind-spot counterexample names the under-covered concept", () =>
  rejectsNaming(perspectivity(BLIND, "2"), "個B"));

test("多面性 without a threshold is a bad requirement", () =>
  rejects(perspectivity(COVERED, ""), [
    "thesis.bad-requirement",
  ]));
