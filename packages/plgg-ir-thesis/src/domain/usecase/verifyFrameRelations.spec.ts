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
 * Accepts `source` (no counterexample diagnostics).
 */
const accepts = (source: string) =>
  check(
    compileThesis(source),
    okThen((c: CompiledThesis) =>
      check(c.nodes.length >= 1, toBe(true)),
    ),
  );

/**
 * Rejects `source` with exactly `wanted` codes.
 */
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

/**
 * Rejects `source` and asserts some diagnostic message
 * contains `needle` (the counterexample names the offense).
 */
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

// ── 類推 (analogy / simulation) ─────────────────────────

/** Source assertion with a single edge s1 → s2. */
const SRC =
  "(主張 SRC :ロジック 因果的 :ルート (概念 s0) (関係 e1 :接続元 (概念 s1) :接続先 (概念 s2)))";

/** Target assertion with the matching edge t1 → t2. */
const DST =
  "(主張 DST :ロジック 因果的 :ルート (概念 t0) (関係 f1 :接続元 (概念 t1) :接続先 (概念 t2)))";

/** Target with t2 present but no t1 → t2 edge. */
const DST_NO_EDGE =
  "(主張 DST :ロジック 因果的 :ルート (概念 t0) (関係 f1 :接続元 (概念 t1) :接続先 (概念 t0)) (概念 t2))";

test("a declared simulation that satisfies the local condition is accepted", () =>
  accepts(
    `${SRC} ${DST} (フレーム ana :種別 類推 :接続元 SRC :接続先 DST (対応 s1 t1) (対応 s2 t2))`,
  ));

test("a simulation whose image edge is absent is rejected with the unmatched step", () =>
  rejects(
    `${SRC} ${DST_NO_EDGE} (フレーム ana :種別 類推 :接続元 SRC :接続先 DST (対応 s1 t1) (対応 s2 t2))`,
    ["thesis.simulation-unmatched"],
  ));

test("the unmatched-step diagnostic names the source edge and the missing image", () =>
  rejectsNaming(
    `${SRC} ${DST_NO_EDGE} (フレーム ana :種別 類推 :接続元 SRC :接続先 DST (対応 s1 t1) (対応 s2 t2))`,
    "e1",
  ));

test("a source edge whose head has no 対応 is an unmatched step", () =>
  rejects(
    `${SRC} ${DST} (フレーム ana :種別 類推 :接続元 SRC :接続先 DST (対応 s1 t1))`,
    ["thesis.simulation-unmatched"],
  ));

test("a 対応 whose source is not a concept of :接続元 is unresolved", () =>
  rejects(
    `${SRC} ${DST} (フレーム ana :種別 類推 :接続元 SRC :接続先 DST (対応 zzz t1))`,
    ["thesis.correspondence-unresolved"],
  ));

test("a 対応 whose target is not a concept of :接続先 is unresolved", () =>
  rejects(
    `${SRC} ${DST} (フレーム ana :種別 類推 :接続元 SRC :接続先 DST (対応 s1 zzz))`,
    ["thesis.correspondence-unresolved"],
  ));

test("an analogy whose :接続元 names no assertion is unresolved", () =>
  rejects(
    `${DST} (フレーム ana :種別 類推 :接続元 NOPE :接続先 DST (対応 s1 t1))`,
    ["thesis.correspondence-unresolved"],
  ));

test("an analogy whose :接続先 names no assertion is an unresolved target", () =>
  rejects(
    `${SRC} (フレーム ana :種別 類推 :接続元 SRC :接続先 NOPE (対応 s1 t1))`,
    ["thesis.unresolved-target"],
  ));

// ── 全対応 (framework totality) ─────────────────────────

/** A framework: problem P1 reaches countermeasure M1 → 検証. */
const FW =
  "(主張 FW :ロジック 因果的 :ルート (概念 検証) (関係 c1 :接続元 (概念 P1) :接続先 (概念 M1)) (関係 c2 :接続元 (概念 M1) :接続先 (概念 検証)))";

test("a framework whose every declared problem is addressed is accepted", () =>
  accepts(
    `${FW} (フレーム tot :種別 全対応 :接続元 FW :接続先 FW (問題 P1))`,
  ));

test("an unaddressed problem is rejected as a totality gap", () =>
  rejects(
    `${FW} (フレーム tot :種別 全対応 :接続元 FW :接続先 FW (問題 P2))`,
    ["thesis.totality-gap"],
  ));

test("the totality-gap diagnostic names the unaddressed node", () =>
  rejectsNaming(
    `${FW} (フレーム tot :種別 全対応 :接続元 FW :接続先 FW (問題 P2))`,
    "P2",
  ));

// ── 合成 (composition commutativity) ────────────────────

/** Three assertions and two chaining part frames A→B→C. */
const ABC =
  "(主張 A :ロジック 因果的 :ルート (概念 ra)) (主張 B :ロジック 因果的 :ルート (概念 rb)) (主張 C :ロジック 因果的 :ルート (概念 rc)) (フレーム p1 :接続元 A :接続先 B) (フレーム p2 :接続元 B :接続先 C) (フレーム p3 :接続元 C :接続先 A)";

test("a composite that agrees with the composition of its parts is accepted", () =>
  accepts(
    `${ABC} (フレーム comp :種別 合成 :接続元 A :接続先 C (部分 p1) (部分 p2))`,
  ));

test("a composite whose endpoints diverge from its parts is rejected", () =>
  rejects(
    `${ABC} (フレーム comp :種別 合成 :接続元 A :接続先 C (部分 p1))`,
    ["thesis.composition-divergent"],
  ));

test("the divergent diagnostic names the composite and the parts' endpoints", () =>
  rejectsNaming(
    `${ABC} (フレーム comp :種別 合成 :接続元 A :接続先 C (部分 p1))`,
    "A→C",
  ));

test("parts that do not chain are rejected", () =>
  rejects(
    `${ABC} (フレーム comp :種別 合成 :接続元 A :接続先 A (部分 p1) (部分 p3))`,
    ["thesis.composition-divergent"],
  ));

test("a 部分 naming no declared frame is rejected", () =>
  rejects(
    `${ABC} (フレーム comp :種別 合成 :接続元 A :接続先 C (部分 nope))`,
    ["thesis.composition-divergent"],
  ));

test("a composition with no 部分 is rejected", () =>
  rejects(
    `${ABC} (フレーム comp :種別 合成 :接続元 A :接続先 C)`,
    ["thesis.composition-divergent"],
  ));
