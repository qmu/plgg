import {
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  ok,
  err,
  pipe,
  mapResult,
  mapOption,
  chainResult,
  matchOption,
  tryCatch,
  invalidError,
  asObj,
  asSoftStr,
  forProp,
  forOptionProp,
} from "plgg";
import { versionString } from "plgg-db-migration";
import { type JsonScalar } from "plgg-cms/domainCore/Domain/model/Field";
import { type DomainManifest } from "plgg-cms/domainCore/Domain/model/DomainManifest";

/**
 * One exported row: a plain record of JSON scalars. A column that is SQL `NULL`
 * (a nullable field's `None`) is an *omitted key*, never `null` — so the export
 * is pure JSON and round-trips through the same absence convention the decoder
 * uses.
 */
export type JsonRow = Readonly<
  Record<string, JsonScalar>
>;

/** All exported rows of one entity, keyed by its table name. */
export type EntityExport = Readonly<{
  entity: SoftStr;
  rows: ReadonlyArray<JsonRow>;
}>;

/**
 * The JSON projection of a {@link DomainManifest}: the schema head is the
 * version *string* (`None` before the first migration), so the whole manifest
 * is plain JSON.
 */
export type ManifestJson = Readonly<{
  domainVersion: SoftStr;
  derivationVersion: SoftStr;
  schemaHead: Option<SoftStr>;
}>;

/**
 * A whole-domain, code-independent dump: the provenance manifest plus every
 * entity's rows. This is the data-portability guarantee that lets the app be
 * discarded and regenerated — it depends on no application code, only the
 * durable {@link Domain}.
 */
export type DomainExport = Readonly<{
  manifest: ManifestJson;
  entities: ReadonlyArray<EntityExport>;
}>;

/** Project a structured {@link DomainManifest} to its JSON form. */
export const manifestJson = (
  manifest: DomainManifest,
): ManifestJson => ({
  domainVersion: manifest.domainVersion,
  derivationVersion:
    manifest.derivationVersion,
  schemaHead: mapOption(versionString)(
    manifest.schemaHead,
  ),
});

/** A plain manifest object with `schemaHead` omitted when absent. */
const plainManifest = (
  manifest: ManifestJson,
): Readonly<Record<string, SoftStr>> =>
  matchOption(
    (): Readonly<Record<string, SoftStr>> => ({
      domainVersion: manifest.domainVersion,
      derivationVersion:
        manifest.derivationVersion,
    }),
    (
      head: SoftStr,
    ): Readonly<Record<string, SoftStr>> => ({
      domainVersion: manifest.domainVersion,
      derivationVersion:
        manifest.derivationVersion,
      schemaHead: head,
    }),
  )(manifest.schemaHead);

/**
 * Serialize an export to a canonical JSON string (absent columns and schema head
 * omitted). Total: the export is acyclic plain data, so `JSON.stringify` cannot
 * throw here.
 */
export const exportToJson = (
  exported: DomainExport,
): SoftStr =>
  JSON.stringify({
    manifest: plainManifest(exported.manifest),
    entities: exported.entities,
  });

/** Validate one JSON scalar (string / number / boolean). */
const asJsonScalar = (
  v: unknown,
): Result<JsonScalar, InvalidError> =>
  typeof v === "string" ||
  typeof v === "number" ||
  typeof v === "boolean"
    ? ok(v)
    : err(
        invalidError({
          message:
            "an exported value must be a JSON scalar",
        }),
      );

/** Validate one JSON row (an object of scalars). */
const asJsonRow = (
  v: unknown,
): Result<JsonRow, InvalidError> =>
  pipe(
    asObj(v),
    chainResult((obj: object) =>
      Object.entries(obj).reduce<
        Result<
          Record<string, JsonScalar>,
          InvalidError
        >
      >(
        (accR, [k, val]) =>
          chainResult(
            (
              acc: Record<string, JsonScalar>,
            ) =>
              pipe(
                asJsonScalar(val),
                mapResult(
                  (s: JsonScalar) => ({
                    ...acc,
                    [k]: s,
                  }),
                ),
              ),
          )(accR),
        ok({}),
      ),
    ),
  );

/** Validate an array of `T` by applying `asItem` to each element. */
const asArrayOf =
  <T>(
    asItem: (
      v: unknown,
    ) => Result<T, InvalidError>,
  ) =>
  (
    v: unknown,
  ): Result<ReadonlyArray<T>, InvalidError> =>
    Array.isArray(v)
      ? v.reduce<
          Result<ReadonlyArray<T>, InvalidError>
        >(
          (accR, item) =>
            chainResult(
              (acc: ReadonlyArray<T>) =>
                pipe(
                  asItem(item),
                  mapResult((t: T) => [
                    ...acc,
                    t,
                  ]),
                ),
            )(accR),
          ok([]),
        )
      : err(
          invalidError({
            message: "expected an array",
          }),
        );

/** Validate a JSON manifest. */
const asManifestJson = (
  v: unknown,
): Result<ManifestJson, InvalidError> =>
  pipe(
    asObj(v),
    chainResult(
      forProp("domainVersion", asSoftStr),
    ),
    chainResult(
      forProp("derivationVersion", asSoftStr),
    ),
    chainResult(
      forOptionProp("schemaHead", asSoftStr),
    ),
  );

/** Validate one entity's export section. */
const asEntityExport = (
  v: unknown,
): Result<EntityExport, InvalidError> =>
  pipe(
    asObj(v),
    chainResult(forProp("entity", asSoftStr)),
    chainResult(
      forProp("rows", asArrayOf(asJsonRow)),
    ),
  );

/** Validate a whole domain export. */
const asDomainExport = (
  v: unknown,
): Result<DomainExport, InvalidError> =>
  pipe(
    asObj(v),
    chainResult(
      forProp("manifest", asManifestJson),
    ),
    chainResult(
      forProp(
        "entities",
        asArrayOf(asEntityExport),
      ),
    ),
  );

/**
 * Parse a canonical JSON string back into a validated {@link DomainExport}. A
 * malformed string or a value that is not a well-formed export folds to an
 * `InvalidError` — never a throw.
 */
export const exportFromJson = (
  text: SoftStr,
): Result<DomainExport, InvalidError> =>
  pipe(
    tryCatch(
      (t: SoftStr): unknown => JSON.parse(t),
      (e): InvalidError =>
        invalidError({
          message: "export is not valid JSON",
          cause: e,
        }),
    )(text),
    chainResult(asDomainExport),
  );
