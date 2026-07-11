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
