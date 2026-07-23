import {
  SoftStr,
  Option,
  some,
  none,
} from "plgg";

/**
 * The three attack types (design.md §4). A closed union
 * — each targets a different part of the assertion it
 * attacks (the attack-typing rule, ticket 3a):
 *
 * - `反駁` (rebut) targets the **root** concept;
 * - `切り崩し` (undercut) targets the **logic
 *   application**;
 * - `掘り崩し` (undermine) targets a **premise /
 *   relation**.
 */
export type AttackType =
  "反駁" | "切り崩し" | "掘り崩し";

/**
 * The three attack types, in canonical order — the
 * closed set unknown-type diagnostics enumerate.
 */
export const ATTACK_TYPES: ReadonlyArray<AttackType> =
  ["反駁", "切り崩し", "掘り崩し"];

/**
 * Parses a symbol name as an {@link AttackType}, `None`
 * when it is not one of the three.
 */
export const parseAttackType = (
  name: SoftStr,
): Option<AttackType> =>
  ATTACK_TYPES.filter((t) => t === name).reduce<
    Option<AttackType>
  >((_, t) => some(t), none());
