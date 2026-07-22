import {
  type SoftStr,
  type Box,
  type Icon,
  box,
  icon,
  pattern,
} from "plgg";

/**
 * The YAML SUBSET plggpress frontmatter is written in
 * (D8) — this doc comment is the NORMATIVE specification.
 * Deliberately bounded so it is fail-closed against
 * untrusted author input (`policies/security.md`): a
 * top-level document is a **map**, whose values are
 * scalars, sequences of scalars, **one-level** nested
 * maps of scalars, or nothing at all. Nothing deeper.
 *
 * The bound is about SHAPE and EXPANSION, not spelling: a
 * construct is admissible when it denotes a value this
 * type can already hold, and carries no aliasing, no type
 * coercion, and no expansion. Two spellings of the same
 * shape are therefore both accepted.
 *
 * SUPPORTED:
 * - Scalars: plain, single-quoted (`'…'`), and
 *   double-quoted (`"…"`) strings; integers and decimals
 *   (`YNum`); the booleans `true`/`false` (`YBool`).
 * - A sequence of scalars under a key, in EITHER spelling
 *   — the indented block form (`- item` lines) or the
 *   inline flow form (`layer: [UX, Domain]`). Both denote
 *   the same {@link YSeq}; `[]` is the empty one.
 * - A one-level nested map of scalars under a key, in
 *   EITHER spelling — the indented block form
 *   (`indented key: scalar` lines) or the inline flow form
 *   (`by: {name: ada, id: 7}`). Both denote the same
 *   {@link YMap}; `{}` is the empty one.
 * - A key with NO value (`commit_hash:`) — {@link YNone},
 *   the absent value. `foldYaml` OMITS such a key, so the
 *   ordinary `forOptionProp` caster reads it as `None`,
 *   per the house wire convention that an absent field is
 *   omitted rather than `null`.
 * - Full-line `#` comments and blank lines.
 *
 * EXCLUDED (each is a parse error, never silently
 * accepted): anchors/aliases (`&`/`*`), tags (`!!`),
 * merge keys (`<<`), block scalars (`|`/`>`),
 * multi-document streams (`---` inside), and YAML 1.1
 * implicit types beyond number/boolean (no
 * `yes`/`no`/`on`/`off`, no sexagesimals, no unquoted
 * timestamps — dates are quoted strings until a consumer
 * earns a branded date field). Duplicate keys are an
 * error, NOT last-wins.
 *
 * NESTING is what bounds the flow forms: a flow
 * collection's ELEMENTS must be scalars, because they are
 * parsed by {@link parseScalarValue}, which still rejects
 * a leading `[`/`{`. So `[[a]]`, `[{a: 1}]`, `{a: [b]}`,
 * and `- [a]` under a block key are all errors — the
 * one-level bound holds by construction, not by a
 * separate depth check. A flow collection is surface
 * sugar over a shape {@link YValue} already models; it
 * buys no new depth.
 *
 * LIST-OF-LIST METADATA (e.g. a VitePress-style `head:`
 * expressed as a sequence of `[tag, attrs]` pairs) is
 * therefore NOT representable, by the same bound — it is a
 * sequence whose items are themselves collections. This is
 * intentional, not a gap to patch: widening the model to
 * hold it would either reintroduce unbounded depth or split
 * the `YSeq` tag into two incompatible shapes. The supported
 * alternative is to express such metadata as NAMED SCALAR
 * keys (`description:`, `ogImage:`, …) and let the rendering
 * layer assemble the `<head>` tags from them — the flat map
 * the subset already models. A `- [a]` / `- {a: 1}` block
 * item is refused with a message pointing here.
 */
export type YScalar =
  | Box<"YStr", SoftStr>
  | Box<"YNum", number>
  | Box<"YBool", boolean>;

/** One entry of a map: a key and its value. */
export type YEntry<V> = readonly [SoftStr, V];

/**
 * The value of a key written with nothing after the colon
 * (`commit_hash:`). An {@link Icon} — a tag with no body —
 * because there is nothing to carry: the document said the
 * key exists and said no more. Distinct from `YStr("")`
 * (`commit_hash: ""`, an explicitly empty string) and from
 * `YSeq([])` (`depends_on: []`, an explicitly empty list),
 * both of which stay their own values.
 */
export type YNone = Icon<"YNone">;

/**
 * A top-level value: a scalar, a sequence of scalars, a
 * one-level nested map of scalars, or nothing — the D8
 * bound expressed in the type, so a deeper structure
 * cannot be constructed. Note that {@link YNone} is a
 * value only HERE, at a key's value position: the elements
 * of a `YSeq`/`YMap` are `YScalar`, so a hole inside a
 * collection is not representable.
 */
export type YValue =
  | YScalar
  | Box<"YSeq", ReadonlyArray<YScalar>>
  | Box<"YMap", ReadonlyArray<YEntry<YScalar>>>
  | YNone;

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
/** Constructs the absent value of a bare `key:`. */
export const yNone = (): YValue => icon("YNone");

/** Matchers for folding a {@link YValue}/{@link YScalar}. */
export const yStr$ = () => pattern("YStr")();
export const yNum$ = () => pattern("YNum")();
export const yBool$ = () => pattern("YBool")();
export const ySeq$ = () => pattern("YSeq")();
export const yMap$ = () => pattern("YMap")();
export const yNone$ = () => pattern("YNone")();
