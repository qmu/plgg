import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";

/**
 * How an aggregate's members are kept consistent
 * (design.md §13); planning semantics arrive with
 * Phase 5 — the core dialect only parses and carries
 * the declaration.
 */
export type Consistency =
  "immediate" | "eventual";

/**
 * One aggregate of the canonical manifest IR: a
 * consistency boundary with a root entity and member
 * entities (design.md §13, §16.6).
 */
export type Aggregate = Readonly<{
  name: SoftStr;
  root: SoftStr;
  members: ReadonlyArray<SoftStr>;
  consistency: Option<Consistency>;
  range: SourceRange;
  rootRange: SourceRange;
  memberRanges: ReadonlyArray<SourceRange>;
}>;

/**
 * Builds an {@link Aggregate}.
 */
export const aggregate = (
  name: SoftStr,
  root: SoftStr,
  members: ReadonlyArray<SoftStr>,
  consistency: Option<Consistency>,
  range: SourceRange,
  rootRange: SourceRange,
  memberRanges: ReadonlyArray<SourceRange>,
): Aggregate => ({
  name,
  root,
  members,
  consistency,
  range,
  rootRange,
  memberRanges,
});
