import {
  type Box,
  type Option,
  type Result,
  type InvalidError,
  invalidError,
  defineVariant,
  ok,
  err,
} from "plgg";
import { type SqlIdent } from "plgg-sql/Sql/model/SqlIdent";

// A payload-free variant body (mirrors plgg-highlight's
// TokenKind idiom): a Box whose content carries no data.
type Empty = Readonly<Record<string, never>>;

/**
 * One column of an FTS5 virtual table: a validated
 * {@link SqlIdent} name and whether it is `UNINDEXED`
 * (stored but not searchable — e.g. a rowid mirror or a URL
 * carried alongside the searchable body).
 */
export type Fts5Column = Readonly<{
  name: SqlIdent;
  unindexed: boolean;
}>;

/** Build an {@link Fts5Column} (indexed unless `unindexed`). */
export const fts5Column = (
  name: SqlIdent,
  unindexed: boolean = false,
): Fts5Column => ({ name, unindexed });

// The three FTS5 content modes, as a closed sum folded with
// exhaustive `match` — a new mode is a compile error until
// every fold handles it (house type-driven discipline).
const NormalV = defineVariant("Fts5Normal")<Empty>();
const ContentlessV =
  defineVariant("Fts5Contentless")<Empty>();
const ExternalV = defineVariant("Fts5External")<{
  table: SqlIdent;
  rowid: SqlIdent;
}>();

/**
 * How the FTS5 table stores its content:
 * - `Normal` — FTS5 owns a private copy of the text.
 * - `Contentless` (`content=''`) — no stored copy; the
 *   index is insert-only and rebuilt from the source (the
 *   D4 "derived, rebuildable" shape). See the module note.
 * - `ExternalContent` (`content='<table>', content_rowid='<id>'`)
 *   — the text lives in an ordinary table; the index is kept
 *   in sync by triggers (`syncFts5`) and can be rebuilt.
 */
export type Fts5Content =
  | Box<"Fts5Normal", Empty>
  | Box<"Fts5Contentless", Empty>
  | Box<
      "Fts5External",
      { table: SqlIdent; rowid: SqlIdent }
    >;

/** FTS5 stores its own copy of the indexed text. */
export const normalContent = (): Fts5Content =>
  NormalV.make({});

/**
 * No stored copy (`content=''`): insert-only, rebuilt from
 * the source. Plain contentless tables do not support
 * UPDATE, and DELETE needs the newer `contentless_delete=1`
 * semantics — so the supported story here is drop/rebuild or
 * the `'rebuild'` command (`fts5Rebuild`). Fits D4: the
 * index is derived and disposable.
 */
export const contentlessContent = (): Fts5Content =>
  ContentlessV.make({});

/**
 * The text lives in `table` keyed by `rowid`; FTS5 stores no
 * copy but can read through to it. Pair with
 * `fts5SyncTriggers` to keep the index current.
 */
export const externalContent = (
  table: SqlIdent,
  rowid: SqlIdent,
): Fts5Content => ExternalV.make({ table, rowid });

/** Pattern guards for folding {@link Fts5Content} with `match`. */
export const normalContent$ = NormalV.pattern;
export const contentlessContent$ =
  ContentlessV.pattern;
export const externalContent$ = ExternalV.pattern;

/**
 * The FTS5 built-in tokenizers, a CLOSED union (no free-form
 * string). `unicode61` is the default Unicode word splitter;
 * `ascii` is its ASCII-only cousin; `porter` stems English;
 * `trigram` does substring/CJK-friendly matching (the
 * practical option for Japanese — `unicode61` splits CJK
 * poorly). Custom tokenizers need the SQLite C API, which
 * `node:sqlite` does not expose, so they are deliberately
 * absent (a D11-adjacent limit).
 */
export type Fts5Tokenizer =
  | "unicode61"
  | "porter"
  | "trigram"
  | "ascii";

/**
 * A typed FTS5 virtual-table spec — the whole
 * `CREATE VIRTUAL TABLE … USING fts5(…)` grammar as data, so
 * a mistyped option is a `tsc` error rather than a runtime
 * `SqlError`. Built through {@link fts5Table} so the
 * non-empty-columns invariant holds by construction.
 */
export type Fts5Table = Readonly<{
  name: SqlIdent;
  columns: ReadonlyArray<Fts5Column>;
  content: Fts5Content;
  tokenizer: Option<Fts5Tokenizer>;
}>;

/**
 * Build an {@link Fts5Table}, validating the one invariant
 * the types cannot express: at least one column (FTS5
 * rejects a zero-column table). Names are already
 * {@link SqlIdent}s and the content/tokenizer are closed
 * unions, so this is the only failure mode.
 */
export const fts5Table = (spec: {
  name: SqlIdent;
  columns: ReadonlyArray<Fts5Column>;
  content: Fts5Content;
  tokenizer: Option<Fts5Tokenizer>;
}): Result<Fts5Table, InvalidError> =>
  spec.columns.length === 0
    ? err(
        invalidError({
          message:
            "Fts5Table requires at least one column",
        }),
      )
    : ok({
        name: spec.name,
        columns: spec.columns,
        content: spec.content,
        tokenizer: spec.tokenizer,
      });
