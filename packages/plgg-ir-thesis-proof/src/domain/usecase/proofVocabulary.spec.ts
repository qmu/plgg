import { test, check, toEqual } from "plgg-test";
import { proofVocabulary } from "plgg-ir-thesis-proof/domain/usecase/proofVocabulary";

test("carries the seven ロジック kinds and three 攻撃 types", () =>
  check(
    proofVocabulary(),
    toEqual([
      "因果的",
      "構成的",
      "時間的",
      "推移的",
      "移動的",
      "勾配的",
      "演繹的",
      "反駁",
      "切り崩し",
      "掘り崩し",
    ]),
  ));
