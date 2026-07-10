import { type SoftStr, type Bool } from "plgg";
import { type ColumnKind } from "plgg-cms/domainCore/Domain/model/ColumnKind";
import { type Domain } from "plgg-cms/domainCore/Domain/model/Domain";

/**
 * A field's storage-facing shape, shared by every derivation seam: the column
 * name, its kind, and whether it is nullable. The common denominator a
 * regenerator needs to reconstruct a correct shell field.
 */
export type FieldShape = Readonly<{
  name: SoftStr;
  kind: ColumnKind;
  nullable: Bool;
}>;

/**
 * The read-only delivery projection (ticket 16 consumes this): every entity as a
 * resource with its fields. Deliberately code-independent — a delivery API is
 * *derived* from it, never hand-written against the schema.
 */
export type DeliveryResource = Readonly<{
  name: SoftStr;
  fields: ReadonlyArray<FieldShape>;
}>;

/** The whole delivery shape of a domain. */
export type DeliveryShape = Readonly<{
  resources: ReadonlyArray<DeliveryResource>;
}>;

/**
 * A typed content model (ticket 17 fills this in). Placeholder shape: 17 rebases
 * onto the spine's `Domain` rather than defining its own model, so this names
 * the seam it consumes.
 */
export type ContentModel = Readonly<{
  entity: SoftStr;
  fields: ReadonlyArray<FieldShape>;
}>;

/**
 * A plggmatic resource/action declaration (ticket 9 fills this in). Placeholder
 * shape closing the "declaration is durable, UI is sacrificial" loop: the
 * declaration is *derived* from the `Domain`.
 */
export type ResourceDeclaration = Readonly<{
  resource: SoftStr;
  fields: ReadonlyArray<FieldShape>;
}>;

/**
 * An MCP tool schema (ticket 26 fills this in). Placeholder shape: the MCP tools
 * a running instance exposes are derived from the same durable core.
 */
export type McpToolSchema = Readonly<{
  tool: SoftStr;
  input: ReadonlyArray<FieldShape>;
}>;

/**
 * The four derivation seams. Each is a *pure function of the durable {@link
 * Domain}* — the sacrificial shell is re-derived, never drifts. Only
 * {@link ToDeliveryShape} is implemented here (the worked example); the other
 * three are the interfaces tickets 17/9/26 implement.
 */
export type ToDeliveryShape = (
  domain: Domain,
) => DeliveryShape;

/** @see ToDeliveryShape — implemented by ticket 17. */
export type ToContentModel = (
  domain: Domain,
) => ReadonlyArray<ContentModel>;

/** @see ToDeliveryShape — implemented by ticket 9. */
export type ToResourceDeclaration = (
  domain: Domain,
) => ReadonlyArray<ResourceDeclaration>;

/** @see ToDeliveryShape — implemented by ticket 26. */
export type ToMcpToolSchema = (
  domain: Domain,
) => ReadonlyArray<McpToolSchema>;
