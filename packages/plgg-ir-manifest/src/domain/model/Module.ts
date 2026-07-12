import { SoftStr } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { Entity } from "plgg-ir-manifest/domain/model/Entity";
import { Aggregate } from "plgg-ir-manifest/domain/model/Aggregate";
import { Projection } from "plgg-ir-manifest/domain/model/Projection";
import { Policy } from "plgg-ir-manifest/domain/model/Policy";
import { View } from "plgg-ir-manifest/domain/model/View";
import { Action } from "plgg-ir-manifest/domain/model/Action";

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
  projections: ReadonlyArray<Projection>;
  policies: ReadonlyArray<Policy>;
  views: ReadonlyArray<View>;
  actions: ReadonlyArray<Action>;
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
  projections: ReadonlyArray<Projection>,
  policies: ReadonlyArray<Policy>,
  views: ReadonlyArray<View>,
  actions: ReadonlyArray<Action>,
  range: SourceRange,
): Module => ({
  version,
  name,
  entities,
  aggregates,
  projections,
  policies,
  views,
  actions,
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

/**
 * The projection named `name`, if declared.
 */
export const projectionOf = (
  m: Module,
  name: SoftStr,
): ReadonlyArray<Projection> =>
  m.projections.filter((p) => p.name === name);

/**
 * The policy named `name`, if declared.
 */
export const policyOf = (
  m: Module,
  name: SoftStr,
): ReadonlyArray<Policy> =>
  m.policies.filter((p) => p.name === name);

/**
 * The view named `name`, if declared.
 */
export const viewOf = (
  m: Module,
  name: SoftStr,
): ReadonlyArray<View> =>
  m.views.filter((v) => v.name === name);

/**
 * The action named `name`, if declared.
 */
export const actionOf = (
  m: Module,
  name: SoftStr,
): ReadonlyArray<Action> =>
  m.actions.filter((a) => a.name === name);
