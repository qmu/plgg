import {
  type SoftStr,
  type Box,
  box,
  pattern,
} from "plgg";

/**
 * The YAML SUBSET plggpress frontmatter is written in
 * (D8) — this doc comment is the NORMATIVE specification.
 * Deliberately bounded so it is fail-closed against
 * untrusted author input (`policies/security.md`): a
 * top-level document is a **map**, whose values are
 * scalars, sequences of scalars, or **one-level** nested
 * maps of scalars. Nothing deeper.
 *
 * SUPPORTED:
 * - Scalars: plain, single-quoted (`'…'`), and
 *   double-quoted (`"…"`) strings; integers and decimals
 *   (`YNum`); the booleans `true`/`false` (`YBool`).
 * - A block sequence of scalars under a key (`- item`
 *   lines, indented).
 * - A one-level nested map of scalars under a key
 *   (`indented key: scalar` lines).
 * - Full-line `#` comments and blank lines.
 *
 * EXCLUDED (each is a parse error, never silently
 * accepted): anchors/aliases (`&`/`*`), tags (`!!`),
 * merge keys (`<<`), block scalars (`|`/`>`), flow
 * collections (`[…]`/`{…}`), multi-document streams
 * (`---` inside), and YAML 1.1 implicit types beyond
 * number/boolean (no `yes`/`no`/`on`/`off`, no
 * sexagesimals, no unquoted timestamps — dates are quoted
 * strings until a consumer earns a branded date field).
 * Duplicate keys are an error, NOT last-wins.
 */
export type YScalar =
  | Box<"YStr", SoftStr>
  | Box<"YNum", number>
  | Box<"YBool", boolean>;

/** One entry of a map: a key and its value. */
export type YEntry<V> = readonly [SoftStr, V];

/**
 * A top-level value: a scalar, a sequence of scalars, or
 * a one-level nested map of scalars — the D8 bound
 * expressed in the type, so a deeper structure cannot be
 * constructed.
 */
export type YValue =
  | YScalar
  | Box<"YSeq", ReadonlyArray<YScalar>>
  | Box<"YMap", ReadonlyArray<YEntry<YScalar>>>;

/** A parsed frontmatter document: a map of {@link YValue}s. */
export type YamlMap = ReadonlyArray<
  YEntry<YValue>
>;

/** Constructs a `YStr` scalar. */
export const yStr = (v: SoftStr): YScalar =>
  box("YStr")(v);
/** Constructs a `YNum` scalar. */
export const yNum = (v: number): YScalar =>
  box("YNum")(v);
/** Constructs a `YBool` scalar. */
export const yBool = (v: boolean): YScalar =>
  box("YBool")(v);
/** Constructs a `YSeq` of scalars. */
export const ySeq = (
  items: ReadonlyArray<YScalar>,
): YValue => box("YSeq")(items);
/** Constructs a `YMap` of scalar entries. */
export const yMap = (
  entries: ReadonlyArray<YEntry<YScalar>>,
): YValue => box("YMap")(entries);

/** Matchers for folding a {@link YValue}/{@link YScalar}. */
export const yStr$ = () => pattern("YStr")();
export const yNum$ = () => pattern("YNum")();
export const yBool$ = () => pattern("YBool")();
export const ySeq$ = () => pattern("YSeq")();
export const yMap$ = () => pattern("YMap")();
