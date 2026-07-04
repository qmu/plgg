import {
  SoftStr,
  some,
  matchOption,
} from "plgg";
import { sqlIdentString } from "plgg-sql";
import {
  Version,
  Migration,
  migration,
} from "plgg-db-migration";
import {
  Field,
  Reference,
} from "plgg-domain/Domain/model/Field";
import {
  Entity,
  primaryKeyFields,
} from "plgg-domain/Domain/model/Entity";
import { Domain } from "plgg-domain/Domain/model/Domain";
import { sqliteType } from "plgg-domain/Domain/model/ColumnKind";

/** One column's DDL: `name TYPE [NOT NULL] [UNIQUE]`. */
export const columnDefinition = (
  field: Field,
): SoftStr =>
  `${sqlIdentString(field.name)} ${sqliteType(
    field.kind,
  )}${field.nullable ? "" : " NOT NULL"}${
    field.unique ? " UNIQUE" : ""
  }`;

/** A table-level `PRIMARY KEY (...)` clause, or none. */
const primaryKeyClause = (
  entity: Entity,
): ReadonlyArray<SoftStr> => {
  const pk = primaryKeyFields(entity);
  return pk.length === 0
    ? []
    : [
        `PRIMARY KEY (${pk
          .map((f) => sqlIdentString(f.name))
          .join(", ")})`,
      ];
};

/** The `FOREIGN KEY (...) REFERENCES ...` clauses of an entity. */
const foreignKeyClauses = (
  entity: Entity,
): ReadonlyArray<SoftStr> =>
  entity.fields.flatMap((f) =>
    matchOption(
      (): ReadonlyArray<SoftStr> => [],
      (r: Reference): ReadonlyArray<SoftStr> => [
        `FOREIGN KEY (${sqlIdentString(
          f.name,
        )}) REFERENCES ${sqlIdentString(
          r.entity,
        )} (${sqlIdentString(r.field)})`,
      ],
    )(f.references),
  );

/** The full `CREATE TABLE` for one entity. */
export const createTableDdl = (
  entity: Entity,
): SoftStr =>
  `CREATE TABLE ${sqlIdentString(
    entity.name,
  )} (\n  ${[
    ...entity.fields.map(columnDefinition),
    ...primaryKeyClause(entity),
    ...foreignKeyClauses(entity),
  ].join(",\n  ")}\n);`;

/**
 * The `CREATE TABLE` DDL for a whole domain, entities in declaration order.
 * Pure and deterministic — the same {@link Domain} always emits the same DDL, so
 * regeneration is reproducible.
 */
export const ddlOf = (domain: Domain): SoftStr =>
  domain.entities
    .map(createTableDdl)
    .join("\n\n");

/** The `DROP TABLE` DDL, in reverse order (so referencers drop first). */
export const dropDdlOf = (
  domain: Domain,
): SoftStr =>
  [...domain.entities]
    .reverse()
    .map(
      (e) =>
        `DROP TABLE IF EXISTS ${sqlIdentString(
          e.name,
        )};`,
    )
    .join("\n");

/**
 * Derive the domain's schema as a `plgg-db-migration` {@link Migration} at
 * `version`, so the generated schema joins the append-only migration history
 * rather than being applied ad hoc. `up` creates every table; `down` drops them
 * in reverse. Deterministic given `(version, domain)`.
 */
export const schemaOf =
  (version: Version) =>
  (domain: Domain): Migration =>
    migration({
      version,
      name: `${domain.name} schema`,
      up: ddlOf(domain),
      down: some(dropDdlOf(domain)),
      upTransaction: true,
      downTransaction: true,
    });
