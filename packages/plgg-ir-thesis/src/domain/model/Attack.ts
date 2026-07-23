import { SoftStr } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { AttackType } from "plgg-ir-thesis/domain/model/AttackType";

/**
 * One attack (攻撃) declared by a frame:
 * `(攻撃 <name> <type> <target>)`. `type` is the
 * {@link AttackType}; `target` names a declared relation
 * or concept of the attacked assertion — reference
 * closure and type→target matching are checked in
 * ticket 3a (`targetRange` locates the reference for the
 * straw-man diagnostic).
 */
export type Attack = Readonly<{
  name: SoftStr;
  type: AttackType;
  target: SoftStr;
  targetRange: SourceRange;
  range: SourceRange;
}>;

/**
 * Builds an {@link Attack}.
 */
export const attack = (
  name: SoftStr,
  type: AttackType,
  target: SoftStr,
  targetRange: SourceRange,
  range: SourceRange,
): Attack => ({
  name,
  type,
  target,
  targetRange,
  range,
});
