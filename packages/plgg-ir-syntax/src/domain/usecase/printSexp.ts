import { SoftStr, pipe, match } from "plgg";
import {
  Sexp,
  isListExp,
  symbolExp$,
  strExp$,
  numExp$,
  boolExp$,
  listExp$,
} from "plgg-ir-syntax/domain/model/Sexp";

/**
 * One canonical indentation step.
 */
const INDENT = "  ";

/**
 * Escapes one character for a canonical string
 * literal: the closed escape set (`\"`, `\\`, `\n`,
 * `\t`, `\r`); everything else prints verbatim.
 */
const escapeChar = (ch: SoftStr): SoftStr =>
  ch === "\\"
    ? "\\\\"
    : ch === '"'
      ? '\\"'
      : ch === "\n"
        ? "\\n"
        : ch === "\t"
          ? "\\t"
          : ch === "\r"
            ? "\\r"
            : ch;

/**
 * Prints a canonical string literal from a decoded
 * value.
 */
const printStr = (value: SoftStr): SoftStr =>
  `"${[...value].map(escapeChar).join("")}"`;

/**
 * Is this node an atom (not a list)? The canonical
 * layout rule branches on it.
 */
const isAtom = (exp: Sexp): boolean =>
  !isListExp(exp);

/**
 * Prints a list at `depth`. The canonical layout rule:
 * a list of only atoms prints inline
 * (`(length-between 1 200)`); otherwise the leading
 * run of atoms stays on the head line and every
 * remaining element gets its own line one indent
 * deeper — which reproduces the layout the design
 * document writes manifests in (design.md §7).
 */
const printList = (
  depth: number,
  items: ReadonlyArray<Sexp>,
): SoftStr =>
  items.every(isAtom)
    ? `(${items.map(printAt(depth)).join(" ")})`
    : pipe(
        items.findIndex(isListExp),
        (split: number): SoftStr =>
          `(${items
            .slice(0, split)
            .map(printAt(depth))
            .join(" ")}${items
            .slice(split)
            .map(
              (item) =>
                `\n${INDENT.repeat(depth + 1)}${printAt(depth + 1)(item)}`,
            )
            .join("")})`,
      );

/**
 * Prints one node at `depth` (the recursion worker
 * behind {@link printSexp}).
 */
const printAt =
  (depth: number) =>
  (exp: Sexp): SoftStr =>
    match(exp)(
      [
        symbolExp$(),
        ({ content }): SoftStr => content.name,
      ],
      [
        strExp$(),
        ({ content }): SoftStr =>
          printStr(content.value),
      ],
      [
        numExp$(),
        ({ content }): SoftStr =>
          String(content.value),
      ],
      [
        boolExp$(),
        ({ content }): SoftStr =>
          content.value ? "true" : "false",
      ],
      [
        listExp$(),
        ({ content }): SoftStr =>
          printList(depth, content.items),
      ],
    );

/**
 * Prints one {@link Sexp} tree as canonical text. The
 * output is deterministic — the same tree always
 * prints identically — and reparses to a structurally
 * equal tree: `parse(print(parse(x))) = parse(x)`
 * (design.md §33). Source ranges are not preserved;
 * canonical printing assigns new positions by
 * construction.
 */
export const printSexp = (exp: Sexp): SoftStr =>
  printAt(0)(exp);

/**
 * Prints a sequence of top-level {@link Sexp} trees,
 * separated by one blank line (the canonical layout
 * for a multi-form source file).
 */
export const printSexps = (
  exprs: ReadonlyArray<Sexp>,
): SoftStr => exprs.map(printSexp).join("\n\n");
