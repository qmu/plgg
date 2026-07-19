/**
 * The Thesis dialect's diagnostic codes. Each names one
 * offense the evaluator can refuse, in the family-wide
 * `namespace.kebab-case` shape (design.md §35). Pass ①
 * (vocabulary + uniformity) codes live here; later
 * passes append their own.
 */

/**
 * A top-level `(plgg-ir-thesis ...)` root, or one of its
 * children, is malformed.
 */
export const codeBadRoot = "thesis.bad-root";

/**
 * The root declares an unsupported `(plgg-ir-thesis
 * <version> ...)` version.
 */
export const codeUnsupportedVersion =
  "thesis.unsupported-version";

/**
 * A `(主張 ...)` assertion form is malformed (missing
 * name, missing/duplicate `:ロジック`, missing
 * `:ルート`, …).
 */
export const codeBadAssertion =
  "thesis.bad-assertion";

/**
 * A `(関係 ...)` relation clause is malformed.
 */
export const codeBadRelation =
  "thesis.bad-relation";

/**
 * A `(概念 ...)` concept reference is malformed.
 */
export const codeBadConcept =
  "thesis.bad-concept";

/**
 * A `(フレーム ...)` frame form is malformed.
 */
export const codeBadFrame = "thesis.bad-frame";

/**
 * An `(攻撃 ...)` attack clause is malformed.
 */
export const codeBadAttack = "thesis.bad-attack";

/**
 * A form head names no registered thesis form (closed
 * vocabulary, design.md §36.3).
 */
export const codeUnknownForm =
  "thesis.unknown-form";

/**
 * A `:keyword` attribute is not in the form's closed
 * attribute set (design.md §4).
 */
export const codeUnknownAttribute =
  "thesis.unknown-attribute";

/**
 * A `:ロジック` value is not one of the seven declared
 * logic kinds (design.md §3).
 */
export const codeUnknownLogicKind =
  "thesis.unknown-logic-kind";

/**
 * A relation carries a logic kind different from its
 * assertion's declared kind — the uniformity violation
 * (design.md §3: an assertion must be uniform).
 */
export const codeMixedLogic =
  "thesis.mixed-logic";

/**
 * The same name is declared twice among an assertion's
 * relations, or among the top-level assertions.
 */
export const codeDuplicateName =
  "thesis.duplicate-name";
