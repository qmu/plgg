import {
  SoftStr,
  Option,
  some,
  none,
} from "plgg";

/**
 * The four stakeholder sorts (種) a concept may declare
 * (design.md §5.10). A closed union of the metamodel's
 * kinds: 生物 (living), 無生物 (non-living), 物質
 * (matter), 観念 (idea). Sort exclusivity forbids mixing
 * them within one assertion.
 */
export type Sort =
  "生物" | "無生物" | "物質" | "観念";

/**
 * The four sorts, in canonical order — the closed set
 * unknown-sort diagnostics enumerate.
 */
export const SORTS: ReadonlyArray<Sort> = [
  "生物",
  "無生物",
  "物質",
  "観念",
];

/**
 * Parses a symbol name as a {@link Sort}, `None` when it
 * is not one of the four.
 */
export const parseSort = (
  name: SoftStr,
): Option<Sort> =>
  SORTS.filter((s) => s === name).reduce<
    Option<Sort>
  >((_, s) => some(s), none());
