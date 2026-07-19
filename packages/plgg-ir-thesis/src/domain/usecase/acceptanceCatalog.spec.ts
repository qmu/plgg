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
 * The design.md §5 verification catalog, end to end
 * (syntax → language → thesis passes). Each of the
 * thirteen cases is driven to its specified accept / reject
 * outcome; where the catalog names a counterexample, the
 * diagnostic is checked to carry it. This spec is the
 * executable model of "done" for the dialect.
 */

const accepts = (source: string) =>
  check(
    compileThesis(source),
    okThen((c: CompiledThesis) =>
      check(c.nodes.length >= 1, toBe(true)),
    ),
  );

const rejects = (
  source: string,
  code: string,
) =>
  check(
    compileThesis(source),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.some((d) => d.code === code),
          toBe(true),
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

// ── the design.md §4 reference example ──────────────────

const 撤退論 =
  "(主張 撤退論 :ロジック 因果的 :ルート (概念 撤退判断) (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減)) (関係 r2 :接続元 (概念 売上減) :接続先 (概念 撤退判断)) (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))";

const 反論 = (attacks: string): string =>
  `${撤退論} (フレーム 継続論による反論 :種別 反論 :接続元 継続論 :接続先 撤退論 :要求 (遮断 前提→ルート) ${attacks})`;

test("reference example: the complete frame is accepted", () =>
  accepts(
    反論(
      "(攻撃 s1 掘り崩し r1) (攻撃 s2 切り崩し r2) (攻撃 s3 掘り崩し r3)",
    ),
  ));

test("reference example: removing 攻撃 s3 surfaces the surviving path", () =>
  rejectsNaming(
    反論(
      "(攻撃 s1 掘り崩し r1) (攻撃 s2 切り崩し r2)",
    ),
    "競合参入 →r3→ 撤退判断",
  ));

// ── 1. rebuttal completeness (被覆 / 遮断) ───────────────

test("catalog 1: 被覆 rejects an unattacked relation", () =>
  rejects(
    `${撤退論} (フレーム F :種別 反論 :接続元 継続論 :接続先 撤退論 :要求 (被覆 関係) (攻撃 s1 掘り崩し r1) (攻撃 s2 切り崩し r2))`,
    "thesis.coverage-gap",
  ));

// ── 2. framework totality (全対応) ──────────────────────

const FW =
  "(主張 FW :ロジック 因果的 :ルート (概念 検証) (関係 c1 :接続元 (概念 P1) :接続先 (概念 M1)) (関係 c2 :接続元 (概念 M1) :接続先 (概念 検証)))";

test("catalog 2: 全対応 accepts an addressed framework", () =>
  accepts(
    `${FW} (フレーム t :種別 全対応 :接続元 FW :接続先 FW (問題 P1))`,
  ));

test("catalog 2: 全対応 rejects an unaddressed problem", () =>
  rejects(
    `${FW} (フレーム t :種別 全対応 :接続元 FW :接続先 FW (問題 P9))`,
    "thesis.totality-gap",
  ));

// ── 3. circular reasoning (依存) ────────────────────────

const THREE =
  "(主張 A :ロジック 因果的 :ルート (概念 ra)) (主張 B :ロジック 因果的 :ルート (概念 rb)) (主張 C :ロジック 因果的 :ルート (概念 rc))";

test("catalog 3: 依存 cycle is rejected", () =>
  rejects(
    `${THREE} (フレーム d1 :種別 依存 :接続元 A :接続先 B) (フレーム d2 :種別 依存 :接続元 B :接続先 C) (フレーム d3 :種別 依存 :接続元 C :接続先 A)`,
    "thesis.circular-reasoning",
  ));

// ── 4. intra-stance consistency ─────────────────────────

test("catalog 4: same-stance 反論 is an intra-stance contradiction", () =>
  rejects(
    "(主張 P :ロジック 因果的 :立場 保守 :ルート (概念 xp)) (主張 Q :ロジック 因果的 :立場 保守 :ルート (概念 xq)) (フレーム c :種別 反論 :接続元 P :接続先 Q (攻撃 a1 反駁 xq))",
    "thesis.stance-contradiction",
  ));

// ── 5. blind-spot (多面性) ──────────────────────────────

test("catalog 5: 多面性 rejects an under-covered concept", () =>
  rejects(
    "(主張 A :ロジック 因果的 :立場 楽観 :ルート (概念 共通) (関係 e1 :接続元 (概念 共通) :接続先 (概念 論点))) (主張 B :ロジック 因果的 :立場 悲観 :ルート (概念 共通) (関係 e2 :接続元 (概念 共通) :接続先 (概念 論点)) (概念 個B)) (フレーム bs :種別 多面性 :接続元 A :接続先 A :要求 (多面性 2))",
    "thesis.perspectivity-gap",
  ));

// ── 6. straw-man rejection (attack reference closure) ───

test("catalog 6: an attack on an undeclared relation is a straw-man", () =>
  rejects(
    `${撤退論} (フレーム F :種別 反論 :接続元 継続論 :接続先 撤退論 (攻撃 s1 掘り崩し r9))`,
    "thesis.attack-unresolved",
  ));

// ── 7. analogy soundness (類推) ─────────────────────────

const SRC =
  "(主張 SRC :ロジック 因果的 :ルート (概念 s0) (関係 e1 :接続元 (概念 s1) :接続先 (概念 s2)))";
const DST =
  "(主張 DST :ロジック 因果的 :ルート (概念 t0) (関係 f1 :接続元 (概念 t1) :接続先 (概念 t2)))";

test("catalog 7: a satisfied simulation is accepted", () =>
  accepts(
    `${SRC} ${DST} (フレーム a :種別 類推 :接続元 SRC :接続先 DST (対応 s1 t1) (対応 s2 t2))`,
  ));

test("catalog 7: a broken simulation is rejected", () =>
  rejects(
    `${SRC} (主張 DST :ロジック 因果的 :ルート (概念 t0) (関係 f1 :接続元 (概念 t1) :接続先 (概念 t0)) (概念 t2)) (フレーム a :種別 類推 :接続元 SRC :接続先 DST (対応 s1 t1) (対応 s2 t2))`,
    "thesis.simulation-unmatched",
  ));

// ── 8. temporal coherence (時間的) ──────────────────────

test("catalog 8: an acyclic 時間的 assertion is accepted", () =>
  accepts(
    "(主張 T :ロジック 時間的 :ルート (概念 a) (関係 e1 :接続元 (概念 a) :接続先 (概念 b)))",
  ));

test("catalog 8: a cyclic 時間的 assertion is rejected", () =>
  rejects(
    "(主張 T :ロジック 時間的 :ルート (概念 a) (関係 e1 :接続元 (概念 a) :接続先 (概念 b)) (関係 e2 :接続元 (概念 b) :接続先 (概念 a)))",
    "thesis.cyclic-assertion",
  ));

// ── 9. transfer conservation (移動的) ───────────────────

test("catalog 9: a balanced 移動的 assertion is accepted", () =>
  accepts(
    "(主張 M :ロジック 移動的 :ルート (概念 sink) (関係 in :接続元 (概念 src) :接続先 (概念 mid) :量 10) (関係 out :接続元 (概念 mid) :接続先 (概念 sink) :量 10))",
  ));

test("catalog 9: an unbalanced 移動的 assertion is rejected", () =>
  rejects(
    "(主張 M :ロジック 移動的 :ルート (概念 sink) (関係 in :接続元 (概念 src) :接続先 (概念 mid) :量 10) (関係 out :接続元 (概念 mid) :接続先 (概念 sink) :量 7))",
    "thesis.transfer-imbalance",
  ));

// ── 10. sort exclusivity (種) ───────────────────────────

test("catalog 10: a single-sort assertion is accepted", () =>
  accepts(
    "(主張 S :ロジック 因果的 :ルート (概念 r) (関係 e :接続元 (概念 a :種 生物) :接続先 (概念 b :種 生物)))",
  ));

test("catalog 10: a sort-mixed assertion is rejected", () =>
  rejects(
    "(主張 S :ロジック 因果的 :ルート (概念 r) (関係 e :接続元 (概念 a :種 生物) :接続先 (概念 b :種 物質)))",
    "thesis.sort-mixed",
  ));

// ── 11. composition commutativity (可換 / 合成) ─────────

test("catalog 11: a composite that agrees with its parts is accepted", () =>
  accepts(
    `${THREE} (フレーム p1 :接続元 A :接続先 B) (フレーム p2 :接続元 B :接続先 C) (フレーム comp :種別 合成 :接続元 A :接続先 C (部分 p1) (部分 p2))`,
  ));

test("catalog 11: a diverging composite is rejected", () =>
  rejects(
    `${THREE} (フレーム p1 :接続元 A :接続先 B) (フレーム comp :種別 合成 :接続元 A :接続先 C (部分 p1))`,
    "thesis.composition-divergent",
  ));

// ── 12. survival semantics (grounded extension) ─────────

test("catalog 12: the grounded extension of A→B→C is {A, C}", () =>
  check(
    compileThesis(
      `${THREE} (フレーム f1 :種別 反論 :接続元 A :接続先 B) (フレーム f2 :種別 反論 :接続元 B :接続先 C)`,
    ),
    okThen((c: CompiledThesis) =>
      check(c.surviving, toEqual(["A", "C"])),
    ),
  ));

// ── 13. weights are inert annotations ───────────────────

test("catalog 13: :重み and :客観性 are carried inert (accepted)", () =>
  accepts(
    "(主張 W :ロジック 因果的 :ルート (概念 r :重み 5) (関係 e :接続元 (概念 a) :接続先 (概念 r) :重み 3 :客観性 8))",
  ));
