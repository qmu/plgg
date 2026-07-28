import { SoftStr, Option } from "plgg";
import {
  Sexp,
  SourceRange,
} from "plgg-ir-syntax";
import { Attack } from "plgg-ir-thesis/domain/model/Attack";

/**
 * One declared state correspondence of a 類推 (analogy)
 * frame: `(対応 <接続元-concept> <接続先-concept>)`. The
 * writer declares the mapping between the two assertions'
 * concepts; the simulation checker only *checks* it
 * (design.md §2, §5.7 — checking a declared simulation is
 * polynomial, searching is NP-hard). `range` locates the
 * clause for the unmatched-step diagnostic.
 */
export type Correspondence = Readonly<{
  from: SoftStr;
  to: SoftStr;
  range: SourceRange;
}>;

/**
 * Builds a {@link Correspondence}.
 */
export const correspondence = (
  from: SoftStr,
  to: SoftStr,
  range: SourceRange,
): Correspondence => ({ from, to, range });

/**
 * A bare `(問題 <name>)` / `(部分 <name>)` reference: a
 * name plus its source range. 全対応 (totality) frames
 * name their problem nodes with it; 合成 (composition)
 * frames name their part frames with it.
 */
export type FrameRef = Readonly<{
  name: SoftStr;
  range: SourceRange;
}>;

/**
 * Builds a {@link FrameRef}.
 */
export const frameRef = (
  name: SoftStr,
  range: SourceRange,
): FrameRef => ({ name, range });

/**
 * One frame (フレーム) — a relation between whole
 * assertions (design.md §2): a declared attack,
 * simulation, totality, or composition from its `:接続元`
 * assertion to its `:接続先` assertion. `kind` is its
 * `:種別` (反論 / 類推 / 全対応 / 合成); `require` carries
 * the raw `:要求` requirement expression (`(遮断 前提→
 * ルート)` / `(被覆 関係)`) that the model checker parses
 * and evaluates (ticket 4). Each frame kind reads one
 * declared clause bucket: `attacks` (反論, ticket 3a),
 * `correspondences` (類推, ticket 3b), `problems` (全対応,
 * ticket 3b), and `parts` (合成, ticket 3b).
 */
export type Frame = Readonly<{
  name: SoftStr;
  kind: Option<SoftStr>;
  from: SoftStr;
  to: SoftStr;
  require: Option<Sexp>;
  attacks: ReadonlyArray<Attack>;
  correspondences: ReadonlyArray<Correspondence>;
  problems: ReadonlyArray<FrameRef>;
  parts: ReadonlyArray<FrameRef>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Frame}.
 */
export const frame = (
  name: SoftStr,
  kind: Option<SoftStr>,
  from: SoftStr,
  to: SoftStr,
  require: Option<Sexp>,
  attacks: ReadonlyArray<Attack>,
  correspondences: ReadonlyArray<Correspondence>,
  problems: ReadonlyArray<FrameRef>,
  parts: ReadonlyArray<FrameRef>,
  range: SourceRange,
): Frame => ({
  name,
  kind,
  from,
  to,
  require,
  attacks,
  correspondences,
  problems,
  parts,
  range,
});
