import {
  SoftStr,
  Option,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import {
  Sexp,
  ListExp,
  symbolExp,
  listExp,
  isListExp,
  isSymbolExp,
  printSexp,
} from "plgg-ir-syntax";
import { Normalizer } from "plgg-ir-language";
import {
  partitionAttrs,
  Attr,
} from "plgg-ir-thesis/domain/usecase/sexpUtil";

/**
 * The forms whose attribute + clause layout is
 * canonicalised. Only the top-level `主張` / `フレーム`
 * forms are reordered: their attributes and their clause
 * children (関係 / 概念 / 攻撃 / 対応 / 問題 / 部分) are
 * order-independent, so sorting them is meaning-preserving.
 * Positional-argument forms (攻撃 / 対応 …) are never
 * touched — their argument order **is** meaning.
 */
const REORDER_FORMS: ReadonlyArray<SoftStr> = [
  "主張",
  "フレーム",
];

/**
 * The Thesis canonical stable-ordering rule (design.md
 * §6, §33): within every top-level assertion / frame,
 * attributes sort by key and clause children sort by
 * printed text, while the head and name atoms and every
 * positional argument stay in place. Deterministic and
 * idempotent — `normalize ∘ normalize = normalize` — the
 * same property obligation as the manifest dialect.
 */
export const thesisStableOrder: Normalizer = {
  name: "thesis-stable-order",
  apply: (exp: Sexp): Sexp => reorderForm(exp),
};

/**
 * Reorders a top-level `主張` / `フレーム` form; leaves
 * everything else verbatim.
 */
const reorderForm = (exp: Sexp): Sexp =>
  !isListExp(exp)
    ? exp
    : pipe(
        headName(exp),
        matchOption(
          (): Sexp => exp,
          (h: SoftStr): Sexp =>
            REORDER_FORMS.includes(h)
              ? reorder(exp)
              : exp,
        ),
      );

/**
 * A list's head symbol name, when it has one.
 */
const headName = (
  list: ListExp,
): Option<SoftStr> =>
  list.content.items
    .slice(0, 1)
    .filter(isSymbolExp)
    .reduce<Option<SoftStr>>(
      (_, s) => some(s.content.name),
      none(),
    );

/**
 * Rebuilds a form as `[head, name, sorted attrs, sorted
 * clauses]`.
 */
const reorder = (list: ListExp): ListExp =>
  pipe(
    partitionAttrs(list.content.items.slice(2)),
    (parts) =>
      listExp(
        [
          ...list.content.items.slice(0, 2),
          ...[...parts.attrs]
            .sort(byKey)
            .flatMap((a) => [
              symbolExp(a.key, a.keyRange),
              a.value,
            ]),
          ...[...parts.rest].sort(byPrint),
        ],
        list.content.range,
      ),
  );

/**
 * Attribute order: by key name.
 */
const byKey = (a: Attr, b: Attr): number =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

/**
 * Clause order: by canonical printed text.
 */
const byPrint = (a: Sexp, b: Sexp): number =>
  pipe(printSexp(a), (pa) =>
    pipe(printSexp(b), (pb) =>
      pa < pb ? -1 : pa > pb ? 1 : 0,
    ),
  );
