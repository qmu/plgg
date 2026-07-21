import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { LogicKind } from "plgg-ir-thesis/domain/model/LogicKind";
import { Concept } from "plgg-ir-thesis/domain/model/Concept";
import { Relation } from "plgg-ir-thesis/domain/model/Relation";

/**
 * One assertion (主張) — a finite Kripke model with a
 * root state (design.md §2). It declares a single
 * `:ロジック` (all its relations share it — uniformity,
 * §3), a `:ルート` concept, an optional `:立場` (stance,
 * for intra-stance consistency, ticket 4), and the
 * concepts and relations that form its argument graph.
 */
export type Assertion = Readonly<{
  name: SoftStr;
  logic: LogicKind;
  root: SoftStr;
  stance: Option<SoftStr>;
  concepts: ReadonlyArray<Concept>;
  relations: ReadonlyArray<Relation>;
  range: SourceRange;
}>;

/**
 * Builds an {@link Assertion}.
 */
export const assertion = (
  name: SoftStr,
  logic: LogicKind,
  root: SoftStr,
  stance: Option<SoftStr>,
  concepts: ReadonlyArray<Concept>,
  relations: ReadonlyArray<Relation>,
  range: SourceRange,
): Assertion => ({
  name,
  logic,
  root,
  stance,
  concepts,
  relations,
  range,
});
