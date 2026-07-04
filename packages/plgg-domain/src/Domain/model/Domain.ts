import {
  Result,
  Option,
  SoftStr,
  InvalidError,
  ok,
  err,
  pipe,
  mapResult,
  chainResult,
  fromNullable,
  invalidError,
  asSoftStr,
} from "plgg";
import {
  SqlIdent,
  sqlIdentString,
} from "plgg-sql";
import {
  Entity,
  EntitySpec,
  asEntity,
} from "plgg-domain/Domain/model/Entity";

/**
 * The durable core: one authored, named record of {@link Entity} declarations
 * that everything downstream is *derived* from — the SQLite schema, the boot
 * gate, the canonical export, and the derivation seams. Authored once as a
 * {@link DomainSpec} and validated by {@link asDomain}; the sacrificial shell is
 * regenerated out of it and provably cannot drift from it.
 */
export type Domain = Readonly<{
  name: SoftStr;
  entities: ReadonlyArray<Entity>;
}>;

/** A declarative domain description, validated by {@link asDomain}. */
export type DomainSpec = Readonly<{
  name: string;
  entities: ReadonlyArray<EntitySpec>;
}>;

/** Validate every entity spec, gathering them into one `Result`. */
const sequenceEntities = (
  specs: ReadonlyArray<EntitySpec>,
): Result<
  ReadonlyArray<Entity>,
  InvalidError
> =>
  specs.reduce<
    Result<ReadonlyArray<Entity>, InvalidError>
  >(
    (accR, spec) =>
      chainResult(
        (acc: ReadonlyArray<Entity>) =>
          pipe(
            asEntity(spec),
            mapResult((e: Entity) => [
              ...acc,
              e,
            ]),
          ),
      )(accR),
    ok([]),
  );

/** A domain must declare at least one entity. */
const ensureNonEmpty = (
  entities: ReadonlyArray<Entity>,
): Result<
  ReadonlyArray<Entity>,
  InvalidError
> =>
  entities.length === 0
    ? err(
        invalidError({
          message:
            "a domain must declare at least one entity",
        }),
      )
    : ok(entities);

/** Entity (table) names must be distinct within a domain. */
const ensureDistinct = (
  entities: ReadonlyArray<Entity>,
): Result<
  ReadonlyArray<Entity>,
  InvalidError
> => {
  const names = entities.map((e) =>
    sqlIdentString(e.name),
  );
  return new Set(names).size === names.length
    ? ok(entities)
    : err(
        invalidError({
          message:
            "duplicate entity name within a domain",
        }),
      );
};

/**
 * Validate a {@link DomainSpec} into a {@link Domain}: require a non-empty name,
 * validate every entity, and reject an empty or duplicate-entity domain. The
 * single construction point for the durable core.
 */
export const asDomain = (
  spec: DomainSpec,
): Result<Domain, InvalidError> =>
  pipe(
    asSoftStr(spec.name),
    chainResult((name: SoftStr) =>
      name.length === 0
        ? err(
            invalidError({
              message:
                "a domain name must be non-empty",
            }),
          )
        : pipe(
            sequenceEntities(spec.entities),
            chainResult(ensureNonEmpty),
            chainResult(ensureDistinct),
            mapResult(
              (
                entities: ReadonlyArray<Entity>,
              ): Domain => ({
                name,
                entities,
              }),
            ),
          ),
    ),
  );

/**
 * Look up an entity by its (branded) table name. `None` when the domain has no
 * such entity — used by import to match an export section to its entity.
 */
export const entityByName = (
  domain: Domain,
  name: SqlIdent,
): Option<Entity> =>
  fromNullable(
    domain.entities.find(
      (e) =>
        sqlIdentString(e.name) ===
        sqlIdentString(name),
    ),
  );
