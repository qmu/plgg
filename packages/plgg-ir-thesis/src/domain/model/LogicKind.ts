import {
  SoftStr,
  Option,
  some,
  none,
} from "plgg";

/**
 * The seven logic kinds (ロジック) an assertion may
 * declare (design.md §3). A closed union of the
 * metamodel's Japanese surface keywords — every
 * assertion carries exactly one, and all its relations
 * share it (uniformity).
 *
 * | kind | modal system | static frame condition |
 * | 因果的 | basic K | directedness only |
 * | 構成的 | S4 part-whole | transitivity, partial order |
 * | 時間的 | GL / CTL on DAGs | acyclicity + `:時点` monotonicity |
 * | 推移的 | PDL programs | transition typing, path checks |
 * | 移動的 | multi-agent dynamic | transfer conservation |
 * | 勾配的 | graded modal | numeric/unit coherence (inert v1) |
 * | 演繹的 | propositional core | boolean consistency |
 */
export type LogicKind =
  | "因果的"
  | "構成的"
  | "時間的"
  | "推移的"
  | "移動的"
  | "勾配的"
  | "演繹的";

/**
 * The seven logic kinds, in canonical order — the
 * closed set unknown-kind diagnostics enumerate.
 */
export const LOGIC_KINDS: ReadonlyArray<LogicKind> =
  [
    "因果的",
    "構成的",
    "時間的",
    "推移的",
    "移動的",
    "勾配的",
    "演繹的",
  ];

/**
 * Parses a symbol name as a {@link LogicKind}, `None`
 * when it is not one of the seven.
 */
export const parseLogicKind = (
  name: SoftStr,
): Option<LogicKind> =>
  LOGIC_KINDS.filter((k) => k === name).reduce<
    Option<LogicKind>
  >((_, k) => some(k), none());
