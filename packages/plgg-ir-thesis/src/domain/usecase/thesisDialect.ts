import { Dialect } from "plgg-ir-language";
import { ThesisNode } from "plgg-ir-thesis/domain/model";
import {
  assertionForm,
  frameForm,
} from "plgg-ir-thesis/domain/usecase/thesisForms";
import { thesisStableOrder } from "plgg-ir-thesis/domain/usecase/normalizeThesis";

/**
 * The Thesis vocabulary as one composable dialect — the
 * second dialect on `plgg-ir-language`, sibling to
 * `manifestDialect` (design.md §6). Its top-level forms
 * are `主張` (assertion) and `フレーム` (frame); `概念`
 * (concept), `関係` (relation), and `攻撃` (attack) are
 * their nested vocabulary, parsed by the forms
 * themselves. The `thesis-stable-order` normalizer gives
 * deterministic, idempotent canonical text (design.md
 * §33). No operators or expanders. `plgg-ir-manifest` is
 * never touched.
 */
export const thesisDialect: Dialect<ThesisNode> =
  {
    name: "thesis",
    forms: [assertionForm, frameForm],
    operators: [],
    expanders: [],
    normalizers: [thesisStableOrder],
  };
