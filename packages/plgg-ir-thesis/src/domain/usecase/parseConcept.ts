import {
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import {
  Sexp,
  ListExp,
  SourceRange,
  isListExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language";
import {
  Concept,
  concept,
  codeBadConcept,
  codeUnknownAttribute,
} from "plgg-ir-thesis/domain/model";
import {
  partitionAttrs,
  attr,
  asNumber,
  asSymbolName,
  symbolArg,
  Attr,
} from "plgg-ir-thesis/domain/usecase/sexpUtil";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The closed attribute set of a `(概念 ...)` occurrence
 * (design.md §4): a node-level timestamp/quantity/sort
 * plus the inert weight/objectivity annotations.
 */
const CONCEPT_ATTRS: ReadonlyArray<string> = [
  ":時点",
  ":量",
  ":種",
  ":重み",
  ":客観性",
];

/**
 * Parses a `(概念 <name> [:時点 n] [:量 n] [:種 s]
 * [:重み n])` occurrence. The name is required; unknown
 * attributes are rejected (closed vocabulary). Concepts
 * are introduced inline, so the same name may occur
 * several times across an assertion — {@link
 * mergeConcepts} unions their attributes.
 */
export const parseConcept = (
  exp: Sexp,
): Result<Concept, Diags> =>
  !isListExp(exp)
    ? err([
        semError(
          codeBadConcept,
          "a concept must be a (概念 <name> ...) list",
          sexpRange(exp),
        ),
      ])
    : pipe(
        symbolArg(exp, 1),
        matchOption(
          (): Result<Concept, Diags> =>
            err([
              semError(
                codeBadConcept,
                "a concept needs (概念 <name> ...)",
                exp.content.range,
              ),
            ]),
          (name) =>
            buildConcept(
              exp,
              name.content.name,
              name.content.range,
            ),
        ),
      );

/**
 * Builds a concept after its name is known: validates
 * the closed attribute keys, then reads the typed
 * values.
 */
const buildConcept = (
  exp: ListExp,
  name: string,
  range: SourceRange,
): Result<Concept, Diags> =>
  pipe(
    partitionAttrs(exp.content.items.slice(2)),
    (parts) =>
      pipe(
        parts.attrs.flatMap((a): Diags =>
          CONCEPT_ATTRS.includes(a.key)
            ? []
            : [unknownAttr(a, "概念")],
        ),
        (unknown) =>
          unknown.length > 0
            ? err(unknown)
            : ok(
                concept(
                  name,
                  numAttr(parts.attrs, ":時点"),
                  numAttr(parts.attrs, ":量"),
                  symAttr(parts.attrs, ":種"),
                  numAttr(parts.attrs, ":重み"),
                  range,
                ),
              ),
      ),
  );

/**
 * The `unknown-attribute` diagnostic naming the offending
 * `:keyword` and its owning form.
 */
export const unknownAttr = (
  a: Attr,
  form: string,
): SemDiagnostic =>
  semError(
    codeUnknownAttribute,
    `unknown ${form} attribute ${a.key}`,
    a.keyRange,
  );

/**
 * The numeric value of attribute `key`, when present and
 * a number.
 */
const numAttr = (
  attrs: ReadonlyArray<Attr>,
  key: string,
): Option<number> =>
  pipe(
    attr(attrs, key),
    matchOption(
      (): Option<number> => none(),
      (a) => asNumber(a.value),
    ),
  );

/**
 * The symbol value of attribute `key`, when present and
 * a symbol.
 */
const symAttr = (
  attrs: ReadonlyArray<Attr>,
  key: string,
): Option<string> =>
  pipe(
    attr(attrs, key),
    matchOption(
      (): Option<string> => none(),
      (a) => asSymbolName(a.value),
    ),
  );

/**
 * Unions concept occurrences by name: the distinct
 * concepts of an assertion, each carrying the first
 * defined value seen for every attribute (so a bare
 * `(概念 需要縮小)` endpoint and a fuller
 * `(概念 需要縮小 :時点 1)` declaration collapse to one
 * annotated node).
 */
export const mergeConcepts = (
  occurrences: ReadonlyArray<Concept>,
): ReadonlyArray<Concept> =>
  occurrences.reduce<ReadonlyArray<Concept>>(
    (acc, c) =>
      acc.some((seen) => seen.name === c.name)
        ? acc.map((seen) =>
            seen.name === c.name
              ? mergeConceptPair(seen, c)
              : seen,
          )
        : [...acc, c],
    [],
  );

/**
 * Merges two occurrences of one concept name, preferring
 * the already-seen value for each attribute and filling
 * gaps from the later occurrence.
 */
const mergeConceptPair = (
  a: Concept,
  b: Concept,
): Concept =>
  concept(
    a.name,
    firstSome(a.at, b.at),
    firstSome(a.quantity, b.quantity),
    firstSome(a.sort, b.sort),
    firstSome(a.weight, b.weight),
    a.range,
  );

/**
 * The first of two options that carries a value.
 */
const firstSome = <A>(
  a: Option<A>,
  b: Option<A>,
): Option<A> =>
  pipe(
    a,
    matchOption(
      (): Option<A> => b,
      (v: A): Option<A> => some(v),
    ),
  );
