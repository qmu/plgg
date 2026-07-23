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
  SymbolExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  semError,
  partitionResults,
} from "plgg-ir-language";
import {
  Frame,
  Attack,
  AttackType,
  Correspondence,
  FrameRef,
  frame,
  attack,
  correspondence,
  frameRef,
  parseAttackType,
  ATTACK_TYPES,
  codeBadFrame,
  codeBadAttack,
  codeUnknownForm,
} from "plgg-ir-thesis/domain/model";
import {
  partitionAttrs,
  attr,
  asSymbolName,
  symbolArg,
  isClause,
  Attr,
} from "plgg-ir-thesis/domain/usecase/sexpUtil";
import { unknownAttr } from "plgg-ir-thesis/domain/usecase/parseConcept";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The closed attribute set of a `(フレーム ...)` form.
 */
const FRAME_ATTRS: ReadonlyArray<string> = [
  ":種別",
  ":接続元",
  ":接続先",
  ":要求",
  ":立場",
  ":対象",
];

/**
 * The closed positional-child vocabulary of a `(フレーム
 * ...)` form, one bucket per frame kind: `攻撃` (反論,
 * ticket 3a), `対応` (類推), `問題` (全対応), `部分`
 * (合成). Any other child is an unknown-form error.
 */
const FRAME_CLAUSES: ReadonlyArray<string> = [
  "攻撃",
  "対応",
  "問題",
  "部分",
];

/**
 * Analyzes a `(フレーム <name> :種別 <k> :接続元 <src>
 * :接続先 <dst> :要求 <expr> (攻撃 ...)*)` form into a
 * {@link Frame}. Pass ①: closed attribute vocabulary,
 * the two required assertion endpoints, and structurally
 * well-formed attacks (name + one of the three attack
 * types + a target symbol). Reference closure and attack
 * typing are checked later (ticket 3a) over the whole
 * node set; the `:要求` requirement is carried raw for
 * the model checker (ticket 4).
 */
export const analyzeFrame = (
  form: ListExp,
): Result<Frame, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Frame, Diags> =>
        err([
          semError(
            codeBadFrame,
            "a frame needs (フレーム <name> ...)",
            form.content.range,
          ),
        ]),
      (name) =>
        buildFrame(form, name.content.name),
    ),
  );

/**
 * Builds the frame once its name is known.
 */
const buildFrame = (
  form: ListExp,
  name: SoftStr,
): Result<Frame, Diags> =>
  pipe(
    partitionAttrs(form.content.items.slice(2)),
    (parts) =>
      finalizeFrame(
        form,
        name,
        parts.attrs,
        [
          ...parts.attrs.flatMap((a): Diags =>
            FRAME_ATTRS.includes(a.key)
              ? []
              : [unknownAttr(a, "フレーム")],
          ),
          ...unknownClauses(parts.rest),
        ],
        endpointName(
          parts.attrs,
          ":接続元",
          form,
        ),
        endpointName(
          parts.attrs,
          ":接続先",
          form,
        ),
        partitionResults(
          parts.rest
            .filter(isClause("攻撃"))
            .map(parseAttack),
        ),
        partitionResults(
          parts.rest
            .filter(isClause("対応"))
            .map(parseCorrespondence),
        ),
        partitionResults(
          parts.rest
            .filter(isClause("問題"))
            .map(parseFrameRef("問題")),
        ),
        partitionResults(
          parts.rest
            .filter(isClause("部分"))
            .map(parseFrameRef("部分")),
        ),
      ),
  );

/**
 * Accumulates the frame's diagnostics and either
 * assembles it or reports them all.
 */
const finalizeFrame = (
  form: ListExp,
  name: SoftStr,
  attrs: ReadonlyArray<Attr>,
  structural: Diags,
  fromR: Result<SoftStr, Diags>,
  toR: Result<SoftStr, Diags>,
  attacks: Readonly<{
    errors: Diags;
    values: ReadonlyArray<Attack>;
  }>,
  corr: Readonly<{
    errors: Diags;
    values: ReadonlyArray<Correspondence>;
  }>,
  problems: Readonly<{
    errors: Diags;
    values: ReadonlyArray<FrameRef>;
  }>,
  parts: Readonly<{
    errors: Diags;
    values: ReadonlyArray<FrameRef>;
  }>,
): Result<Frame, Diags> =>
  pipe(
    [
      ...structural,
      ...resultErrors(fromR),
      ...resultErrors(toR),
      ...attacks.errors,
      ...corr.errors,
      ...problems.errors,
      ...parts.errors,
    ],
    (allDiags) =>
      pipe(
        resultValue(fromR),
        matchOption(
          (): Result<Frame, Diags> =>
            err(allDiags),
          (from) =>
            pipe(
              resultValue(toR),
              matchOption(
                (): Result<Frame, Diags> =>
                  err(allDiags),
                (to) =>
                  allDiags.length > 0
                    ? err(allDiags)
                    : ok(
                        frame(
                          name,
                          symAttr(attrs, ":種別"),
                          from,
                          to,
                          requireExpr(attrs),
                          attacks.values,
                          corr.values,
                          problems.values,
                          parts.values,
                          form.content.range,
                        ),
                      ),
              ),
            ),
        ),
      ),
  );

/**
 * Diagnoses any positional child that is not an
 * `(攻撃 ...)` clause — the frame's closed child
 * vocabulary.
 */
const unknownClauses = (
  rest: ReadonlyArray<Sexp>,
): Diags =>
  rest.flatMap((child): Diags =>
    FRAME_CLAUSES.some((h) => isClause(h)(child))
      ? []
      : [
          semError(
            codeUnknownForm,
            "a frame child must be (攻撃 ...) / (対応 ...) / (問題 ...) / (部分 ...)",
            sexpRange(child),
          ),
        ],
  );

/**
 * Parses a `(対応 <接続元-concept> <接続先-concept>)`
 * correspondence clause of a 類推 (analogy) frame: two
 * symbols naming a source and a target concept. Reference
 * closure and the simulation condition are checked later
 * (ticket 3b) over the whole node set.
 */
const parseCorrespondence = (
  form: ListExp,
): Result<Correspondence, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Correspondence, Diags> =>
        err([
          badFrameClause(
            form,
            "(対応 <接続元> <接続先>)",
          ),
        ]),
      (src) =>
        pipe(
          symbolArg(form, 2),
          matchOption(
            (): Result<Correspondence, Diags> =>
              err([
                badFrameClause(
                  form,
                  "(対応 <接続元> <接続先>)",
                ),
              ]),
            (dst) =>
              ok(
                correspondence(
                  src.content.name,
                  dst.content.name,
                  form.content.range,
                ),
              ),
          ),
        ),
    ),
  );

/**
 * Parses a bare `(<label> <name>)` reference clause — the
 * `問題` nodes of a 全対応 (totality) frame and the `部分`
 * frames of a 合成 (composition) frame. Their targets are
 * closed and evaluated later (ticket 3b).
 */
const parseFrameRef =
  (label: SoftStr) =>
  (form: ListExp): Result<FrameRef, Diags> =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        (): Result<FrameRef, Diags> =>
          err([
            badFrameClause(
              form,
              `(${label} <name>)`,
            ),
          ]),
        (n) =>
          ok(
            frameRef(
              n.content.name,
              form.content.range,
            ),
          ),
      ),
    );

/**
 * The malformed frame-clause diagnostic, naming the
 * expected shape.
 */
const badFrameClause = (
  form: ListExp,
  shape: SoftStr,
): SemDiagnostic =>
  semError(
    codeBadFrame,
    `a frame clause must be ${shape}`,
    form.content.range,
  );

/**
 * Reads a required `:接続元` / `:接続先 <assertion>`
 * endpoint as a bare assertion name.
 */
const endpointName = (
  attrs: ReadonlyArray<Attr>,
  key: SoftStr,
  form: ListExp,
): Result<SoftStr, Diags> =>
  pipe(
    attr(attrs, key),
    matchOption(
      (): Result<SoftStr, Diags> =>
        err([
          semError(
            codeBadFrame,
            `a frame needs ${key} <assertion>`,
            form.content.range,
          ),
        ]),
      (a) =>
        pipe(
          asSymbolName(a.value),
          matchOption(
            (): Result<SoftStr, Diags> =>
              err([
                semError(
                  codeBadFrame,
                  `${key} must name an assertion`,
                  sexpRange(a.value),
                ),
              ]),
            (n) => ok(n),
          ),
        ),
    ),
  );

/**
 * The raw `:要求` requirement expression, carried for
 * the model checker (ticket 4).
 */
const requireExpr = (
  attrs: ReadonlyArray<Attr>,
): Option<Sexp> =>
  pipe(
    attr(attrs, ":要求"),
    matchOption(
      (): Option<Sexp> => none(),
      (a) => some(a.value),
    ),
  );

/**
 * Parses an `(攻撃 <name> <type> <target>)` clause: a
 * name, one of the three attack types, and a target
 * symbol (its reference is closed and its type matched
 * in ticket 3a).
 */
const parseAttack = (
  form: ListExp,
): Result<Attack, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Attack, Diags> =>
        err([badAttack(form)]),
      (name) =>
        pipe(
          symbolArg(form, 2),
          matchOption(
            (): Result<Attack, Diags> =>
              err([badAttack(form)]),
            (typeSym) =>
              pipe(
                parseAttackType(
                  typeSym.content.name,
                ),
                matchOption(
                  (): Result<Attack, Diags> =>
                    err([
                      unknownAttackType(typeSym),
                    ]),
                  (type) =>
                    finishAttack(
                      form,
                      name.content.name,
                      type,
                    ),
                ),
              ),
          ),
        ),
    ),
  );

/**
 * Reads the attack's target symbol and builds the node.
 */
const finishAttack = (
  form: ListExp,
  name: SoftStr,
  type: AttackType,
): Result<Attack, Diags> =>
  pipe(
    symbolArg(form, 3),
    matchOption(
      (): Result<Attack, Diags> =>
        err([badAttack(form)]),
      (target) =>
        ok(
          attack(
            name,
            type,
            target.content.name,
            target.content.range,
            form.content.range,
          ),
        ),
    ),
  );

/**
 * The malformed-attack diagnostic.
 */
const badAttack = (
  form: ListExp,
): SemDiagnostic =>
  semError(
    codeBadAttack,
    "an attack needs (攻撃 <name> <type> <target>)",
    form.content.range,
  );

/**
 * The unknown-attack-type diagnostic, naming the three
 * declared types.
 */
const unknownAttackType = (
  typeSym: SymbolExp,
): SemDiagnostic =>
  semError(
    codeBadAttack,
    `an attack type must be one of ${ATTACK_TYPES.join(" / ")}`,
    typeSym.content.range,
  );

/**
 * The symbol value of attribute `key`, when present and
 * a symbol.
 */
const symAttr = (
  attrs: ReadonlyArray<Attr>,
  key: SoftStr,
): Option<SoftStr> =>
  pipe(
    attr(attrs, key),
    matchOption(
      (): Option<SoftStr> => none(),
      (a) => asSymbolName(a.value),
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
