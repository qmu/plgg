import {
  SoftStr,
  Bool,
  Option,
  Result,
  ok,
  err,
  some,
  none,
  pipe,
  fromNullable,
  getOr,
} from "plgg";
import {
  MigrationError,
  parseFailure,
} from "plgg-db-migration/domain/model/MigrationError";

/**
 * The body parts a single `.sql` file yields: the trusted `up` script, an
 * `Option` `down` script (`None` when there is no `-- migrate:down` section),
 * and the per-section transaction flags. The {@link Version} and `name` come
 * from the filename and are joined in by `readMigrations`.
 */
export type ParsedMigration = Readonly<{
  up: SoftStr;
  down: Option<SoftStr>;
  upTransaction: Bool;
  downTransaction: Bool;
}>;

// dbmate-style markers (keyword case-sensitive), tolerant of surrounding
// whitespace; a trailing `transaction:false` directive disables wrapping.
const UP_MARKER = /^\s*--\s*migrate:up\b/;
const DOWN_MARKER = /^\s*--\s*migrate:down\b/;
const NO_TRANSACTION = /transaction:\s*false/;

/** The marker line at `index`, or `""` if out of range. */
const markerLine = (
  lines: ReadonlyArray<SoftStr>,
  index: number,
): SoftStr =>
  pipe(fromNullable(lines[index]), getOr(""));

/** The body between a marker line (exclusive) and `endIndex` (exclusive). */
const section = (
  lines: ReadonlyArray<SoftStr>,
  markerIndex: number,
  endIndex: number,
): SoftStr =>
  lines
    .slice(markerIndex + 1, endIndex)
    .join("\n")
    .trim();

/** A section is transactional unless its marker carries `transaction:false`. */
const transactional = (line: SoftStr): Bool =>
  !NO_TRANSACTION.test(line);

/**
 * Parses a single-file migration into its {@link ParsedMigration} parts. Pure
 * (text in, `Result` out) — no filesystem. The bodies are kept **whole** (no
 * splitting on `;`), to be applied as one trusted script via `plgg-sql`'s
 * `runScript`. A missing `-- migrate:up` section is a `ParseFailure`; a missing
 * `-- migrate:down` section yields `down: None` (an irreversible migration).
 *
 * Any non-whitespace content **before** the first `-- migrate:up` marker is also
 * a `ParseFailure`: such SQL would otherwise be silently dropped while the
 * version is still recorded as applied — a "successful" migration that ran
 * nothing and quietly lost authored schema. An empty up *body* (the marker with
 * no SQL under it) is allowed: it is an explicit no-op, not dropped content.
 */
export const parseMigration = (
  text: SoftStr,
): Result<ParsedMigration, MigrationError> => {
  const lines = text.split(/\r?\n/);
  const upIndex = lines.findIndex((line) =>
    UP_MARKER.test(line),
  );
  const downIndex = lines.findIndex(
    (line, i) =>
      i > upIndex && DOWN_MARKER.test(line),
  );
  return upIndex < 0
    ? err(
        parseFailure(
          "migration is missing a '-- migrate:up' section",
        ),
      )
    : lines.slice(0, upIndex).join("\n").trim()
          .length > 0
      ? err(
          parseFailure(
            "SQL found before the '-- migrate:up' marker — move it into the up section",
          ),
        )
      : ok({
          up: section(
            lines,
            upIndex,
            downIndex < 0
              ? lines.length
              : downIndex,
          ),
          down:
            downIndex < 0
              ? none()
              : some(
                  section(
                    lines,
                    downIndex,
                    lines.length,
                  ),
                ),
          upTransaction: transactional(
            markerLine(lines, upIndex),
          ),
          downTransaction:
            downIndex < 0
              ? true
              : transactional(
                  markerLine(lines, downIndex),
                ),
        });
};
