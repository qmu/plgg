/**
 * The closed set of storage kinds a durable {@link Field} maps to. Each kind
 * pins one plgg Atomic caster (the domain type) AND one SQLite storage type
 * (the physical column), so the boundary between "how the domain reads a value"
 * and "how the database stores it" is a single, exhaustive table rather than a
 * scattered convention.
 *
 * This is the *relational core*: `text`/`int`/`real`/`bool`/`time`. Binary
 * (`blob`) and the object-storage layout are deliberately out of scope here —
 * they land with the media work (ticket 23), and the kind set is designed to
 * grow without a boundary redraw.
 */
export type ColumnKind =
  | "text"
  | "int"
  | "real"
  | "bool"
  | "time";

/**
 * The three SQLite column-type names the kinds project onto. `bool` and `int`
 * share `INTEGER` and `time`/`text` share `TEXT` — the *storage* is coarser
 * than the *domain*, which is exactly why the boot gate checks storage
 * compatibility while the entity casters enforce the finer domain type.
 */
export type SqliteType =
  | "TEXT"
  | "INTEGER"
  | "REAL";

/**
 * The kind → SQLite storage projection. Keyed by the closed {@link ColumnKind}
 * as a `Record`, so adding a sixth kind is a compile error until its storage is
 * supplied. Pure, so schema derivation is deterministic.
 */
const STORAGE: Record<ColumnKind, SqliteType> =
  {
    text: "TEXT",
    time: "TEXT",
    int: "INTEGER",
    bool: "INTEGER",
    real: "REAL",
  };

/** The SQLite storage type a {@link ColumnKind} declares. */
export const sqliteType = (
  kind: ColumnKind,
): SqliteType => STORAGE[kind];

/**
 * Map an introspected column's declared type name to a {@link SqliteType} by
 * SQLite's affinity rules (a substring match, case-insensitive), or `None` for
 * a type that names no known affinity. Used by the boot gate to compare a live
 * column against a domain field's expected storage without demanding the exact
 * spelling the schema was authored with.
 */
export const typeAffinity = (
  declared: string,
): SqliteType | "OTHER" => {
  const t = declared.toUpperCase();
  return t.includes("INT")
    ? "INTEGER"
    : t.includes("CHAR") ||
        t.includes("CLOB") ||
        t.includes("TEXT")
      ? "TEXT"
      : t.includes("REAL") ||
          t.includes("FLOA") ||
          t.includes("DOUB")
        ? "REAL"
        : "OTHER";
};
