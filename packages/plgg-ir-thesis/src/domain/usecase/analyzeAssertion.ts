import {
  SoftStr,
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchOption,
  matchResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  semError,
  withRelated,
  partitionResults,
} from "plgg-ir-language";
import {
  Assertion,
  Relation,
  Concept,
  LogicKind,
  assertion,
  relation,
  parseLogicKind,
  LOGIC_KINDS,
  codeBadAssertion,
  codeBadRelation,
  codeUnknownForm,
  codeUnknownLogicKind,
  codeMixedLogic,
  codeDuplicateName,
} from "plgg-ir-thesis/domain/model";
import {
  partitionAttrs,
  attr,
  asNumber,
  asSymbolName,
  symbolArg,
  isClause,
  Attr,
} from "plgg-ir-thesis/domain/usecase/sexpUtil";
import {
  parseConcept,
  mergeConcepts,
  unknownAttr,
} from "plgg-ir-thesis/domain/usecase/parseConcept";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The closed attribute set of a `(主張 ...)` form.
 */
const ASSERTION_ATTRS: ReadonlyArray<string> = [
  ":ロジック",
  ":ルート",
  ":立場",
];

/**
 * The closed attribute set of a `(関係 ...)` clause.
 */
const RELATION_ATTRS: ReadonlyArray<string> = [
  ":接続元",
  ":接続先",
  ":ロジック",
  ":重み",
  ":客観性",
];

/**
 * A relation parsed together with the concept
 * occurrences at its endpoints.
 */
type RelationParse = Readonly<{
  relation: Relation;
  concepts: ReadonlyArray<Concept>;
}>;

/**
 * Analyzes a `(主張 <name> :ロジック <kind>
 * :ルート (概念 <root>) [:立場 <s>] (関係 ...)*
 * (概念 ...)*)` form into an {@link Assertion}. Pass ①:
 * every attribute is checked against the closed
 * vocabulary, the logic kind must be one of the seven,
 * and **uniformity** is enforced — a relation carrying a
 * logic kind other than the assertion's is a compile
 * error (design.md §3). Every diagnostic accumulates.
 */
export const analyzeAssertion = (
  form: ListExp,
): Result<Assertion, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Assertion, Diags> =>
        err([
          semError(
            codeBadAssertion,
            "an assertion needs (主張 <name> ...)",
            form.content.range,
          ),
        ]),
      (name) =>
        buildAssertion(form, name.content.name),
    ),
  );

/**
 * Builds the assertion once its name is known.
 */
const buildAssertion = (
  form: ListExp,
  name: SoftStr,
): Result<Assertion, Diags> =>
  pipe(
    partitionAttrs(form.content.items.slice(2)),
    (parts) =>
      finalizeAssertion(
        form,
        name,
        parts.attrs,
        [
          ...parts.attrs.flatMap((a): Diags =>
            ASSERTION_ATTRS.includes(a.key)
              ? []
              : [unknownAttr(a, "主張")],
          ),
          ...unknownClauses(parts.rest),
        ],
        requireLogic(parts.attrs, form),
        requireRoot(parts.attrs, form),
        partitionResults(
          parts.rest
            .filter(isClause("関係"))
            .map(parseRelation),
        ),
        partitionResults(
          parts.rest
            .filter(isClause("概念"))
            .map(parseConcept),
        ),
      ),
  );

/**
 * Accumulates every diagnostic (structural, logic, root,
 * relations, concepts, uniformity, duplicates) and
 * either assembles the assertion or reports them all.
 */
const finalizeAssertion = (
  form: ListExp,
  name: SoftStr,
  attrs: ReadonlyArray<Attr>,
  structural: Diags,
  logicR: Result<LogicKind, Diags>,
  rootR: Result<Concept, Diags>,
  rels: Readonly<{
    errors: Diags;
    values: ReadonlyArray<RelationParse>;
  }>,
  bare: Readonly<{
    errors: Diags;
    values: ReadonlyArray<Concept>;
  }>,
): Result<Assertion, Diags> =>
  pipe(
    [
      ...structural,
      ...resultErrors(logicR),
      ...resultErrors(rootR),
      ...rels.errors,
      ...bare.errors,
      ...uniformity(
        resultValue(logicR),
        rels.values,
      ),
      ...duplicateRelations(rels.values),
    ],
    (allDiags) =>
      pipe(
        resultValue(logicR),
        matchOption(
          (): Result<Assertion, Diags> =>
            err(allDiags),
          (logic) =>
            pipe(
              resultValue(rootR),
              matchOption(
                (): Result<Assertion, Diags> =>
                  err(allDiags),
                (root) =>
                  allDiags.length > 0
                    ? err(allDiags)
                    : ok(
                        assertion(
                          name,
                          logic,
                          root.name,
                          stanceOf(attrs),
                          mergeConcepts([
                            root,
                            ...bare.values,
                            ...rels.values.flatMap(
                              (r) => r.concepts,
                            ),
                          ]),
                          rels.values.map(
                            (r) => r.relation,
                          ),
                          form.content.range,
                        ),
                      ),
              ),
            ),
        ),
      ),
  );

/**
 * Diagnoses any positional child that is not a
 * `(関係 ...)` or `(概念 ...)` clause — the assertion's
 * closed child vocabulary.
 */
const unknownClauses = (
  rest: ReadonlyArray<Sexp>,
): Diags =>
  rest.flatMap((child): Diags =>
    isClause("関係")(child) ||
    isClause("概念")(child)
      ? []
      : [
          semError(
            codeUnknownForm,
            "an assertion child must be (関係 ...) or (概念 ...)",
            sexpRange(child),
          ),
        ],
  );

/**
 * Reads the required `:ロジック` attribute as a
 * {@link LogicKind}: absent is a bad-assertion error, a
 * non-symbol or unlisted value an unknown-logic-kind
 * error.
 */
const requireLogic = (
  attrs: ReadonlyArray<Attr>,
  form: ListExp,
): Result<LogicKind, Diags> =>
  pipe(
    attr(attrs, ":ロジック"),
    matchOption(
      (): Result<LogicKind, Diags> =>
        err([
          semError(
            codeBadAssertion,
            "an assertion needs one :ロジック <kind>",
            form.content.range,
          ),
        ]),
      (a) =>
        pipe(
          logicOf(a),
          matchOption(
            (): Result<LogicKind, Diags> =>
              err([logicKindError(a)]),
            (k) => ok(k),
          ),
        ),
    ),
  );

/**
 * The {@link LogicKind} an attribute's value names, when
 * it is a symbol naming one of the seven.
 */
const logicOf = (a: Attr): Option<LogicKind> =>
  pipe(
    asSymbolName(a.value),
    matchOption(
      (): Option<LogicKind> => none(),
      (symName) => parseLogicKind(symName),
    ),
  );

/**
 * The `unknown-logic-kind` diagnostic, naming the seven
 * declared kinds.
 */
const logicKindError = (a: Attr): SemDiagnostic =>
  semError(
    codeUnknownLogicKind,
    `:ロジック must be one of ${LOGIC_KINDS.join(" / ")}`,
    sexpRange(a.value),
  );

/**
 * Reads the required `:ルート (概念 <name>)` attribute,
 * returning the root concept.
 */
const requireRoot = (
  attrs: ReadonlyArray<Attr>,
  form: ListExp,
): Result<Concept, Diags> =>
  pipe(
    attr(attrs, ":ルート"),
    matchOption(
      (): Result<Concept, Diags> =>
        err([
          semError(
            codeBadAssertion,
            "an assertion needs one :ルート (概念 <name>)",
            form.content.range,
          ),
        ]),
      (a) => parseConcept(a.value),
    ),
  );

/**
 * The optional `:立場` stance symbol.
 */
const stanceOf = (
  attrs: ReadonlyArray<Attr>,
): Option<SoftStr> =>
  pipe(
    attr(attrs, ":立場"),
    matchOption(
      (): Option<SoftStr> => none(),
      (a) => asSymbolName(a.value),
    ),
  );

/**
 * Uniformity (design.md §3): every relation that carries
 * its own `:ロジック` must match the assertion's declared
 * kind; a divergent kind is a `thesis.mixed-logic`
 * compile error naming both kinds.
 */
const uniformity = (
  declared: Option<LogicKind>,
  rels: ReadonlyArray<RelationParse>,
): Diags =>
  pipe(
    declared,
    matchOption(
      (): Diags => [],
      (kind) =>
        rels.flatMap(({ relation: r }): Diags =>
          pipe(
            r.logic,
            matchOption(
              (): Diags => [],
              (k) =>
                k === kind
                  ? []
                  : [
                      semError(
                        codeMixedLogic,
                        `relation ${r.name} carries logic ${k} but the assertion declares ${kind}`,
                        r.range,
                      ),
                    ],
            ),
          ),
        ),
    ),
  );

/**
 * Diagnoses duplicate relation names within one
 * assertion, pointing back at the first declaration.
 */
const duplicateRelations = (
  rels: ReadonlyArray<RelationParse>,
): Diags =>
  rels.flatMap(({ relation: r }, i) =>
    rels
      .slice(0, i)
      .filter(
        (seen) => seen.relation.name === r.name,
      )
      .slice(0, 1)
      .map((first) =>
        pipe(
          semError(
            codeDuplicateName,
            `duplicate relation name ${r.name}`,
            r.range,
          ),
          withRelated([
            {
              message: "first declared here",
              range: first.relation.range,
            },
          ]),
        ),
      ),
  );

/**
 * Parses a `(関係 <name> :接続元 (概念 A)
 * :接続先 (概念 B) [:ロジック k] [:重み n])` clause into a
 * relation plus its endpoint concepts.
 */
const parseRelation = (
  form: ListExp,
): Result<RelationParse, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<RelationParse, Diags> =>
        err([
          semError(
            codeBadRelation,
            "a relation needs (関係 <name> ...)",
            form.content.range,
          ),
        ]),
      (name) =>
        buildRelation(form, name.content.name),
    ),
  );

/**
 * Builds a relation after its name is known: closed
 * attribute check, both endpoints, and the optional own
 * logic kind — all accumulated.
 */
const buildRelation = (
  form: ListExp,
  name: SoftStr,
): Result<RelationParse, Diags> =>
  pipe(
    partitionAttrs(form.content.items.slice(2)),
    (parts) =>
      finalizeRelation(
        form,
        name,
        parts.attrs,
        endpoint(parts.attrs, ":接続元", form),
        endpoint(parts.attrs, ":接続先", form),
        [
          ...parts.attrs.flatMap((a): Diags =>
            RELATION_ATTRS.includes(a.key)
              ? []
              : [unknownAttr(a, "関係")],
          ),
          ...relationLogicErrors(parts.attrs),
        ],
      ),
  );

/**
 * Accumulates a relation's diagnostics and either
 * assembles it or reports them all.
 */
const finalizeRelation = (
  form: ListExp,
  name: SoftStr,
  attrs: ReadonlyArray<Attr>,
  fromR: Result<Concept, Diags>,
  toR: Result<Concept, Diags>,
  soft: Diags,
): Result<RelationParse, Diags> =>
  pipe(
    [
      ...soft,
      ...resultErrors(fromR),
      ...resultErrors(toR),
    ],
    (allDiags) =>
      pipe(
        resultValue(fromR),
        matchOption(
          (): Result<RelationParse, Diags> =>
            err(allDiags),
          (fromC) =>
            pipe(
              resultValue(toR),
              matchOption(
                (): Result<
                  RelationParse,
                  Diags
                > => err(allDiags),
                (toC) =>
                  allDiags.length > 0
                    ? err(allDiags)
                    : ok({
                        relation: relation(
                          name,
                          fromC.name,
                          toC.name,
                          relationLogicValue(
                            attrs,
                          ),
                          numAttr(attrs, ":重み"),
                          form.content.range,
                        ),
                        concepts: [fromC, toC],
                      }),
              ),
            ),
        ),
      ),
  );

/**
 * Reads a required `:接続元` / `:接続先 (概念 <name>)`
 * endpoint.
 */
const endpoint = (
  attrs: ReadonlyArray<Attr>,
  key: SoftStr,
  form: ListExp,
): Result<Concept, Diags> =>
  pipe(
    attr(attrs, key),
    matchOption(
      (): Result<Concept, Diags> =>
        err([
          semError(
            codeBadRelation,
            `a relation needs ${key} (概念 <name>)`,
            form.content.range,
          ),
        ]),
      (a) => parseConcept(a.value),
    ),
  );

/**
 * The `:ロジック` a relation declares for itself, when
 * present and valid.
 */
const relationLogicValue = (
  attrs: ReadonlyArray<Attr>,
): Option<LogicKind> =>
  pipe(
    attr(attrs, ":ロジック"),
    matchOption(
      (): Option<LogicKind> => none(),
      (a) => logicOf(a),
    ),
  );

/**
 * Diagnoses a present-but-invalid relation `:ロジック`
 * (a non-symbol or unlisted kind).
 */
const relationLogicErrors = (
  attrs: ReadonlyArray<Attr>,
): Diags =>
  pipe(
    attr(attrs, ":ロジック"),
    matchOption(
      (): Diags => [],
      (a) =>
        pipe(
          logicOf(a),
          matchOption(
            (): Diags => [logicKindError(a)],
            (): Diags => [],
          ),
        ),
    ),
  );

/**
 * The numeric value of attribute `key`, when present and
 * a number.
 */
const numAttr = (
  attrs: ReadonlyArray<Attr>,
  key: SoftStr,
): Option<number> =>
  pipe(
    attr(attrs, key),
    matchOption(
      (): Option<number> => none(),
      (a) => asNumber(a.value),
    ),
  );

/**
 * The success value of a `Result` as an `Option`.
 */
const resultValue = <A>(
  r: Result<A, Diags>,
): Option<A> =>
  pipe(
    r,
    matchResult(
      (): Option<A> => none(),
      (v: A): Option<A> => some(v),
    ),
  );

/**
 * The error payload of a `Result`, or `[]` on success.
 */
const resultErrors = <A>(
  r: Result<A, Diags>,
): Diags =>
  pipe(
    r,
    matchResult(
      (es: Diags): Diags => es,
      (): Diags => [],
    ),
  );
