import {
  test,
  check,
  toEqual,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import {
  CompiledThesis,
  compileThesis,
} from "plgg-ir-thesis/domain/usecase/compileThesis";

/**
 * The surviving set (Dung grounded extension) a source
 * compiles to, or `[]` on rejection.
 */
const surviving = (
  source: string,
): ReadonlyArray<string> =>
  pipe(
    compileThesis(source),
    matchResult(
      (): ReadonlyArray<string> => [],
      (c: CompiledThesis) => c.surviving,
    ),
  );

/** Three assertions, no stances, minimal roots. */
const ABC =
  "(主張 A :ロジック 因果的 :ルート (概念 ra)) (主張 B :ロジック 因果的 :ルート (概念 rb)) (主張 C :ロジック 因果的 :ルート (概念 rc))";

test("the three-thesis chain A→B→C yields the grounded set {A, C}", () =>
  check(
    surviving(
      `${ABC} (フレーム f1 :種別 反論 :接続元 A :接続先 B) (フレーム f2 :種別 反論 :接続元 B :接続先 C)`,
    ),
    toEqual(["A", "C"]),
  ));

test("unattacked assertions all survive", () =>
  check(surviving(ABC), toEqual(["A", "B", "C"])));

test("a mutual attack leaves both arguments out of the grounded set", () =>
  check(
    surviving(
      `${ABC} (フレーム f1 :種別 反論 :接続元 A :接続先 B) (フレーム f2 :種別 反論 :接続元 B :接続先 A)`,
    ),
    toEqual(["C"]),
  ));

test("a non-反論 frame is not an attack edge", () =>
  check(
    surviving(
      `${ABC} (フレーム d1 :種別 依存 :接続元 A :接続先 B)`,
    ),
    toEqual(["A", "B", "C"]),
  ));
