import { SoftStr } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { Entity } from "plgg-ir-manifest/domain/model/Entity";
import { Aggregate } from "plgg-ir-manifest/domain/model/Aggregate";

/**
 * The Domain Manifest IR version this package
 * understands. Versioning is required: AI prompts,
 * consumers, and canonical models must agree on
 * semantics (design.md §34).
 */
export const IR_VERSION = 1;

/**
 * The canonical Domain Manifest IR root — what
 * `compileManifest` produces from a verified
 * `(plgg-ir 1 (module <name> ...))` source. Resolved,
 * explicit, deterministic: the durable artifact
 * consumers such as plggmatic interpret (design.md
 * §33).
 */
export type Module = Readonly<{
  version: number;
  name: SoftStr;
  entities: ReadonlyArray<Entity>;
  aggregates: ReadonlyArray<Aggregate>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Module}.
 */
export const module_ = (
  version: number,
  name: SoftStr,
  entities: ReadonlyArray<Entity>,
  aggregates: ReadonlyArray<Aggregate>,
  range: SourceRange,
): Module => ({
  version,
  name,
  entities,
  aggregates,
  range,
});

/**
 * The entity named `name`, if declared.
 */
export const entityOf = (
  m: Module,
  name: SoftStr,
): ReadonlyArray<Entity> =>
  m.entities.filter((e) => e.name === name);
