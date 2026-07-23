import {
  SoftStr,
  Option,
  some,
  none,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  NumExp,
  isListExp,
  isSymbolExp,
  isNumExp,
} from "plgg-ir-syntax";

/**
 * The head symbol of a list, when present — how every
 * manifest clause is dispatched.
 */
export const headOf = (
  list: ListExp,
): Option<SymbolExp> =>
  list.content.items
    .slice(0, 1)
    .filter(isSymbolExp)
    .reduce<Option<SymbolExp>>(
      (_, h) => some(h),
      none(),
    );

/**
 * Does this (known) list start with the head symbol
 * `name`? The non-narrowing companion of
 * {@link isClause} for dispatch chains — a narrowing
 * predicate would false-narrow an already-`ListExp`
 * value to `never`.
 */
export const hasHead =
  (name: SoftStr) =>
  (list: ListExp): boolean =>
    list.content.items
      .slice(0, 1)
      .filter(isSymbolExp)
      .some((h) => h.content.name === name);

/**
 * Is this expression a `(name ...)` clause list? A
 * narrowing predicate for `filter` positions.
 */
export const isClause =
  (name: SoftStr) =>
  (exp: Sexp): exp is ListExp =>
    isListExp(exp) && hasHead(name)(exp);

/**
 * Every `(name ...)` clause among a form's children
 * (the items after its head).
 */
export const clausesNamed = (
  form: ListExp,
  name: SoftStr,
): ReadonlyArray<ListExp> =>
  form.content.items
    .slice(1)
    .filter(isClause(name));

/**
 * The children of a form after its head symbol.
 */
export const childrenOf = (
  form: ListExp,
): ReadonlyArray<Sexp> =>
  form.content.items.slice(1);

/**
 * The symbol argument at `index`, when present.
 */
export const symbolArg = (
  form: ListExp,
  index: number,
): Option<SymbolExp> =>
  form.content.items
    .slice(index, index + 1)
    .filter(isSymbolExp)
    .reduce<Option<SymbolExp>>(
      (_, s) => some(s),
      none(),
    );

/**
 * The number argument at `index`, when present.
 */
export const numberArg = (
  form: ListExp,
  index: number,
): Option<NumExp> =>
  form.content.items
    .slice(index, index + 1)
    .filter(isNumExp)
    .reduce<Option<NumExp>>(
      (_, n) => some(n),
      none(),
    );

/**
 * The single expression argument at `index`, when
 * present (any node kind).
 */
export const exprArg = (
  form: ListExp,
  index: number,
): Option<Sexp> =>
  form.content.items
    .slice(index, index + 1)
    .reduce<Option<Sexp>>(
      (_, e) => some(e),
      none(),
    );
