import {
  SoftStr,
  Option,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language";
import {
  ThesisNode,
  Assertion,
  Frame,
  Attack,
  isAssertionNode,
  isFrameNode,
  codeUnresolvedTarget,
  codeAttackUnresolved,
  codeAttackTypeMismatch,
} from "plgg-ir-thesis/domain/model";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Part of pass ③ (design.md §6, catalog §5.6 + the
 * attack-typing rule §4): every frame's `(攻撃 ...)` must
 * reference a declared relation/concept of its target
 * assertion (reference closure — an attack on an
 * undeclared relation is the straw-man binding error),
 * and its attack type must match what it may target
 * (反駁 → root, 切り崩し / 掘り崩し → relation).
 */
export const verifyFrameAttacks = (
  nodes: ReadonlyArray<ThesisNode>,
): Diags =>
  pipe(
    nodes
      .filter(isAssertionNode)
      .map((n) => n.content),
    (assertions) =>
      nodes
        .filter(isFrameNode)
        .flatMap((n) =>
          verifyFrame(n.content, assertions),
        ),
  );

/**
 * Verifies one frame's attacks against its `:接続先`
 * target assertion; an unresolved target is reported and
 * its attacks skipped (nothing to close them against).
 */
const verifyFrame = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    findAssertion(assertions, f.to),
    matchOption(
      (): Diags => [
        semError(
          codeUnresolvedTarget,
          `frame ${f.name} targets undeclared assertion ${f.to}`,
          f.range,
        ),
      ],
      (target: Assertion) =>
        f.attacks.flatMap((att) =>
          checkAttack(att, target),
        ),
    ),
  );

/**
 * The assertion named `name`, when declared.
 */
const findAssertion = (
  assertions: ReadonlyArray<Assertion>,
  name: SoftStr,
): Option<Assertion> =>
  assertions
    .filter((a) => a.name === name)
    .slice(0, 1)
    .reduce<Option<Assertion>>(
      (_, a) => some(a),
      none(),
    );

/**
 * Checks one attack's reference closure and type against
 * its target assertion. 反駁 must hit the root concept;
 * 切り崩し and 掘り崩し must hit a declared relation. A
 * mismatch with the *other* declared kind is a typing
 * error; a target that is declared nowhere is the
 * straw-man binding error naming the alternatives.
 */
const checkAttack = (
  att: Attack,
  target: Assertion,
): Diags =>
  pipe(
    target.relations.map((r) => r.name),
    (relationNames) =>
      att.type === "反駁"
        ? att.target === target.root
          ? []
          : relationNames.includes(att.target)
            ? [
                typeMismatch(
                  att,
                  `反駁 must target the root concept ${target.root}, but ${att.target} is a relation`,
                ),
              ]
            : [
                strawman(
                  att,
                  target,
                  relationNames,
                ),
              ]
        : relationNames.includes(att.target)
          ? []
          : att.target === target.root
            ? [
                typeMismatch(
                  att,
                  `${att.type} must target a declared relation, but ${att.target} is the root concept`,
                ),
              ]
            : [
                strawman(
                  att,
                  target,
                  relationNames,
                ),
              ],
  );

/**
 * The attack-type-mismatch diagnostic.
 */
const typeMismatch = (
  att: Attack,
  message: SoftStr,
): SemDiagnostic =>
  semError(
    codeAttackTypeMismatch,
    message,
    att.targetRange,
  );

/**
 * The straw-man binding diagnostic, naming the declared
 * alternatives (the root concept and the relations).
 */
const strawman = (
  att: Attack,
  target: Assertion,
  relationNames: ReadonlyArray<SoftStr>,
): SemDiagnostic =>
  semError(
    codeAttackUnresolved,
    `attack ${att.name} references ${att.target}, which ${target.name} does not declare; declared: root ${target.root}${relationNames.length > 0 ? `, relations ${relationNames.join(" / ")}` : ""}`,
    att.targetRange,
  );
