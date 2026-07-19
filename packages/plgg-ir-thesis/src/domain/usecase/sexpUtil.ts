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
  SymbolExp,
  NumExp,
  SourceRange,
  isListExp,
  isSymbolExp,
  isNumExp,
} from "plgg-ir-syntax";

/**
 * Does this list start with the head symbol `name`?
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
 * Is this symbol a `:keyword` attribute name (its name
 * begins with a colon)?
 */
export const isKeyword = (
  exp: Sexp,
): exp is SymbolExp =>
  isSymbolExp(exp) &&
  exp.content.name.slice(0, 1) === ":";

/**
 * One parsed `:keyword value` attribute pair.
 */
export type Attr = Readonly<{
  key: SoftStr;
  keyRange: SourceRange;
  value: Sexp;
}>;

/**
 * The result of splitting a form's items into its
 * `:keyword value` attributes and its positional /
 * clause items.
 */
export type Partitioned = Readonly<{
  attrs: ReadonlyArray<Attr>;
  rest: ReadonlyArray<Sexp>;
}>;

/**
 * The in-progress fold state: the partition so far plus
 * the keyword still awaiting its value, if any.
 */
type ScanState = Readonly<{
  attrs: ReadonlyArray<Attr>;
  rest: ReadonlyArray<Sexp>;
  pending: Option<SymbolExp>;
}>;

/**
 * Splits `items` into `:keyword value` attribute pairs
 * and the remaining positional / clause items,
 * left-to-right: a keyword symbol consumes the next item
 * as its value; any other item is positional. Total and
 * range-preserving, so callers validate keys and read
 * values against a closed set. A trailing keyword with no
 * value falls into `rest` (so the caller's closed-child
 * check reports it rather than dropping it silently).
 */
export const partitionAttrs = (
  items: ReadonlyArray<Sexp>,
): Partitioned =>
  closeScan(
    items.reduce<ScanState>(step, {
      attrs: [],
      rest: [],
      pending: none(),
    }),
  );

/**
 * One fold step: complete a pending keyword, open a new
 * one, or file a positional item.
 */
const step = (
  state: ScanState,
  item: Sexp,
): ScanState =>
  pipe(
    state.pending,
    matchOption(
      (): ScanState =>
        isKeyword(item)
          ? { ...state, pending: some(item) }
          : {
              ...state,
              rest: [...state.rest, item],
            },
      (key: SymbolExp): ScanState => ({
        attrs: [
          ...state.attrs,
          {
            key: key.content.name,
            keyRange: key.content.range,
            value: item,
          },
        ],
        rest: state.rest,
        pending: none(),
      }),
    ),
  );

/**
 * Finishes the scan: a keyword left pending at the end
 * (no value) becomes a positional item so the caller can
 * reject it.
 */
const closeScan = (
  state: ScanState,
): Partitioned =>
  pipe(
    state.pending,
    matchOption(
      (): Partitioned => ({
        attrs: state.attrs,
        rest: state.rest,
      }),
      (key: SymbolExp): Partitioned => ({
        attrs: state.attrs,
        rest: [...state.rest, key],
      }),
    ),
  );

/**
 * The attribute named `key`, when present.
 */
export const attr = (
  attrs: ReadonlyArray<Attr>,
  key: SoftStr,
): Option<Attr> =>
  attrs
    .filter((a) => a.key === key)
    .slice(0, 1)
    .reduce<Option<Attr>>(
      (_, a) => some(a),
      none(),
    );

/**
 * A number literal value, when the expression is one.
 */
export const asNumber = (
  exp: Sexp,
): Option<number> =>
  [exp]
    .filter(isNumExp)
    .reduce<Option<number>>(
      (_, n: NumExp) => some(n.content.value),
      none(),
    );

/**
 * A bare symbol name, when the expression is a symbol.
 */
export const asSymbolName = (
  exp: Sexp,
): Option<SoftStr> =>
  [exp]
    .filter(isSymbolExp)
    .reduce<Option<SoftStr>>(
      (_, s: SymbolExp) => some(s.content.name),
      none(),
    );
