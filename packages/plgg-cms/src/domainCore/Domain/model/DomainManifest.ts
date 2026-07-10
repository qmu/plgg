import {
  type Option,
  type SoftStr,
  matchOption,
} from "plgg";
import { sqlIdentString } from "plgg-sql";
import { type Version } from "plgg-db-migration";
import { type Field } from "plgg-cms/domainCore/Domain/model/Field";
import { type Entity } from "plgg-cms/domainCore/Domain/model/Entity";
import { type Domain } from "plgg-cms/domainCore/Domain/model/Domain";
import { type Reference } from "plgg-cms/domainCore/Domain/model/Field";
import { fingerprint } from "plgg-cms/domainCore/Domain/model/Fingerprint";

/**
 * The derivation-spine version. Bumped when the derivation algorithm (schema
 * mapping, export layout, …) changes in a way that could alter a generated
 * shell, so a running instance records not just *which domain* but *which
 * derivation* produced it.
 */
export const DERIVATION_VERSION: SoftStr = "1";

/** Canonical `entity.field` of a reference, for the fingerprint. */
const canonicalRef = (ref: Reference): string =>
  `${sqlIdentString(ref.entity)}.${sqlIdentString(ref.field)}`;

/**
 * A field's storage-relevant structure as a stable string: name, kind, and
 * persistence attributes. A field's `brand` caster and an entity's invariants
 * are functions and are intentionally *not* captured — they refine domain
 * values but never change storage, which is what the fingerprint identifies.
 */
const canonicalField = (field: Field): string =>
  [
    sqlIdentString(field.name),
    field.kind,
    field.primaryKey ? "pk" : "",
    field.nullable ? "null" : "",
    field.unique ? "uniq" : "",
    matchOption(
      () => "",
      (r: Reference) => `ref(${canonicalRef(r)})`,
    )(field.references),
  ].join("|");

/** An entity's structure as a stable string. */
const canonicalEntity = (
  entity: Entity,
): string =>
  `${sqlIdentString(entity.name)}(${entity.fields
    .map(canonicalField)
    .join(",")})`;

/**
 * A domain's whole structure as a stable string — entities and fields in
 * declaration order. Pure and deterministic, so the same {@link Domain} always
 * serializes identically (the property the fingerprint and regeneration rely
 * on).
 */
export const canonicalDomain = (
  domain: Domain,
): SoftStr =>
  `${domain.name}{${domain.entities
    .map(canonicalEntity)
    .join(";")}}`;

/**
 * The domain's structural fingerprint — the {@link fingerprint} of its
 * {@link canonicalDomain}. Same structure → same digest, across processes and
 * machines.
 */
export const fingerprintDomain = (
  domain: Domain,
): SoftStr =>
  fingerprint(canonicalDomain(domain));

/**
 * The provenance manifest of a running instance: which domain structure
 * (`domainVersion`), which derivation (`derivationVersion`), and which
 * schema-migration head the store is at (`None` before the first migration).
 * Written on boot and embedded in the canonical export, so any generation is
 * auditable and rollback-able.
 */
export type DomainManifest = Readonly<{
  domainVersion: SoftStr;
  derivationVersion: SoftStr;
  schemaHead: Option<Version>;
}>;

/** Build the {@link DomainManifest} for a domain at a given schema head. */
export const domainManifest = (
  domain: Domain,
  schemaHead: Option<Version>,
): DomainManifest => ({
  domainVersion: fingerprintDomain(domain),
  derivationVersion: DERIVATION_VERSION,
  schemaHead,
});

/**
 * Whether two manifests describe the same generation (same domain structure and
 * derivation). The schema head may legitimately differ (a store can be mid-
 * migration), so it is not part of generation identity.
 */
export const sameGeneration = (
  a: DomainManifest,
  b: DomainManifest,
): boolean =>
  a.domainVersion === b.domainVersion &&
  a.derivationVersion === b.derivationVersion;
