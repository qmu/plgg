/**
 * The stable diagnostic codes of the Domain Manifest
 * dialect, namespaced `manifest.<area>.<problem>`
 * (design.md §35). The syntax and framework layers own
 * the `syntax.*` and `language.*` codes; everything
 * manifest-specific lives here.
 */

/** The source is not `(plgg-ir <version> ...)`. */
export const codeBadRoot =
  "manifest.root.malformed";

/** The declared IR version is not supported. */
export const codeUnsupportedVersion =
  "manifest.root.unsupported-version";

/** A module is not `(module <name> ...)`. */
export const codeBadModule =
  "manifest.module.malformed";

/** A module child is not a known manifest form. */
export const codeUnknownModuleForm =
  "manifest.module.unknown-form";

/** An entity is not `(entity <name> ...)`. */
export const codeBadEntity =
  "manifest.entity.malformed";

/** An entity child is not a known entity clause. */
export const codeUnknownEntityForm =
  "manifest.entity.unknown-form";

/** A field/relation name repeats within an entity. */
export const codeDuplicateMember =
  "manifest.entity.duplicate-member";

/** A field is not `(field <name> ...)` with a type. */
export const codeBadField =
  "manifest.field.malformed";

/** A field child is not a known field clause. */
export const codeUnknownFieldForm =
  "manifest.field.unknown-form";

/** A `(validate ...)` rule is not in the vocabulary. */
export const codeBadValidation =
  "manifest.field.bad-validation";

/** A relation is missing/garbling target or cardinality. */
export const codeBadRelation =
  "manifest.relation.malformed";

/** A relation targets an entity that does not exist. */
export const codeUnknownTarget =
  "manifest.relation.unknown-target";

/** An inverse names no back-pointing relation. */
export const codeBadInverse =
  "manifest.relation.bad-inverse";

/** An aggregate is malformed. */
export const codeBadAggregate =
  "manifest.aggregate.malformed";

/** An aggregate root/member is not a declared entity. */
export const codeUnknownAggregateEntity =
  "manifest.aggregate.unknown-entity";

/** An entity belongs to more than one aggregate. */
export const codeDuplicateAggregateMember =
  "manifest.aggregate.duplicate-member";

/** A member has no relation linking it to its root. */
export const codeUnrelatedMember =
  "manifest.aggregate.unrelated-member";

/** An invariant / condition must type to boolean. */
export const codeNonBooleanCondition =
  "manifest.expression.non-boolean";

/** A dotted path does not resolve on the entity graph. */
export const codeUnknownPath =
  "manifest.path.unknown";

/** A projection is malformed. */
export const codeBadProjection =
  "manifest.projection.malformed";

/** A projection reference names no declared projection. */
export const codeUnknownProjection =
  "manifest.projection.unknown";

/** A field is not exposed by the projection (§15). */
export const codeNotProjected =
  "manifest.projection.not-exposed";

/** A policy is malformed. */
export const codeBadPolicy =
  "manifest.policy.malformed";

/** A policy reference names no declared policy. */
export const codeUnknownPolicy =
  "manifest.policy.unknown";

/** A view is malformed. */
export const codeBadView =
  "manifest.view.malformed";

/** A view reference names no declared view. */
export const codeUnknownView =
  "manifest.view.unknown";

/** A layout child is not a known layout form. */
export const codeUnknownLayoutForm =
  "manifest.view.unknown-layout-form";

/**
 * A layout path is not available in the view's query
 * scope (the design §35 example diagnostic).
 */
export const codePathNotLoaded =
  "manifest.view.relation-not-loaded";

/**
 * A layout path crosses the view's declared aggregate
 * boundary (design §14).
 */
export const codeAggregateBoundary =
  "manifest.view.aggregate-boundary";

/** A scalar/collection path used in the wrong slot. */
export const codeListScalarMisuse =
  "manifest.view.list-scalar-misuse";

/** A navigation omits a target-view parameter. */
export const codeMissingParameter =
  "manifest.view.missing-parameter";

/** A navigation supplies an undeclared parameter. */
export const codeUnknownParameter =
  "manifest.view.unknown-parameter";

/** An action is malformed. */
export const codeBadAction =
  "manifest.action.malformed";

/** An action reference names no declared action. */
export const codeUnknownAction =
  "manifest.action.unknown";

/**
 * An action with effects declares no authorization —
 * deny-by-default makes this a compile error
 * (design §36.1, §16.8).
 */
export const codeMissingAuthorize =
  "manifest.action.missing-authorize";

/** An effect targets something that is not settable. */
export const codeBadEffect =
  "manifest.action.bad-effect";

/** A derive/materialize declaration is malformed. */
export const codeBadDerive =
  "manifest.derive.malformed";

/** Derived fields form a dependency cycle (§36.8). */
export const codeCircularDerivation =
  "manifest.derive.circular";

/**
 * An effect writes a derived field — derived values
 * have exactly one source of truth (§36.6–36.7).
 */
export const codeNotWritable =
  "manifest.derive.not-writable";

/**
 * An immediate materialization depends on data
 * outside the field's aggregate (§16.9).
 */
export const codeIncompatibleConsistency =
  "manifest.derive.incompatible-consistency";
