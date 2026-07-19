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

/**
 * A 時間的 (temporal) or 構成的 (constitutive) assertion
 * has a cycle in its relation graph — a GL/partial-order
 * frame-condition violation (design.md §3). The
 * diagnostic names the cycle.
 */
export const codeCyclicAssertion =
  "thesis.cyclic-assertion";

/**
 * A 時間的 assertion has an edge whose `:時点`
 * (timestamp) decreases from source to target — a
 * monotonicity violation (design.md §3). The diagnostic
 * names the offending edge.
 */
export const codeTimeNotMonotonic =
  "thesis.time-not-monotonic";

/**
 * A 移動的 (transfer) assertion has an internal node
 * whose inflow `:量` does not equal its outflow, and it
 * is not a declared `:変換` (transformation) escape —
 * a conservation violation (design.md §3, §5.9). The
 * diagnostic names the node.
 */
export const codeTransferImbalance =
  "thesis.transfer-imbalance";

/**
 * An assertion mixes more than one stakeholder `:種`
 * (sort) across its concepts — a sort-exclusivity
 * violation (design.md §5.10). The diagnostic names the
 * mixed sorts.
 */
export const codeSortMixed = "thesis.sort-mixed";

/**
 * A concept's `:種` value is not one of the four
 * declared sorts (design.md §5.10).
 */
export const codeUnknownSort =
  "thesis.unknown-sort";

/**
 * A frame's `:接続先` target names no declared assertion,
 * so its attacks cannot be reference-closed.
 */
export const codeUnresolvedTarget =
  "thesis.unresolved-target";

/**
 * An attack references a target (relation or concept)
 * that the target assertion does not declare — the
 * straw-man rejection (design.md §5.6): a binding error,
 * not a lint. The diagnostic names the declared
 * alternatives.
 */
export const codeAttackUnresolved =
  "thesis.attack-unresolved";

/**
 * An attack's type does not match the kind of target it
 * may attack (design.md §4): 反駁 → root concept,
 * 切り崩し / 掘り崩し → a declared relation.
 */
export const codeAttackTypeMismatch =
  "thesis.attack-type-mismatch";

/**
 * A 類推 (analogy) frame's declared correspondence names a
 * concept neither `:接続元` nor `:接続先` assertion
 * declares — the mapping cannot be checked (design.md
 * §5.7). The diagnostic names the offending side.
 */
export const codeCorrespondenceUnresolved =
  "thesis.correspondence-unresolved";

/**
 * A 類推 (analogy) frame's declared simulation fails the
 * local condition: a source edge has no matching edge
 * between the images of its endpoints (design.md §2,
 * §5.7). The diagnostic names the first unmatched step.
 */
export const codeSimulationUnmatched =
  "thesis.simulation-unmatched";

/**
 * A 全対応 (framework totality) frame has a declared
 * problem node with no countermeasure step — the
 * `□(問題 → ⟨対策⟩⊤)` violation (design.md §5.2). The
 * diagnostic names the unaddressed node.
 */
export const codeTotalityGap =
  "thesis.totality-gap";

/**
 * A 合成 (composition) frame diverges from the composition
 * of its declared parts: a missing part, a non-chaining
 * pair, or endpoints that disagree with the parts'
 * outer endpoints (design.md §5.11 可換/合成). The
 * diagnostic names the divergence.
 */
export const codeCompositionDivergent =
  "thesis.composition-divergent";
