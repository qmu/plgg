import {
  SoftStr,
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  fromNullable,
  matchOption,
  match,
} from "plgg";
import { SourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import {
  SourceRange,
  sourceRange,
} from "plgg-ir-syntax/domain/model/SourceRange";
import {
  SyntaxDiagnostic,
  syntaxError,
  codeUnterminatedList,
  codeUnexpectedCloseParen,
} from "plgg-ir-syntax/domain/model/SyntaxDiagnostic";
import {
  Token,
  lParenTok$,
  rParenTok$,
  symbolTok$,
  strTok$,
  numTok$,
  boolTok$,
} from "plgg-ir-syntax/domain/model/Token";
import {
  Sexp,
  symbolExp,
  strExp,
  numExp,
  boolExp,
  listExp,
  sexpRange,
} from "plgg-ir-syntax/domain/model/Sexp";
import { tokenize } from "plgg-ir-syntax/domain/usecase/tokenize";

/**
 * One expression's worth of reading: zero or one
 * produced expressions (an error may produce none),
 * the diagnostics it raised, and the index of the next
 * unread token.
 */
type ReadOne = Readonly<{
  exprs: ReadonlyArray<Sexp>;
  diagnostics: ReadonlyArray<SyntaxDiagnostic>;
  next: number;
}>;

/**
 * A sibling run's worth of reading: the items read,
 * the diagnostics raised, the next unread token, and —
 * when the run ended at a `)` — that close paren's
 * range (`None` means the run ended at end of input).
 */
type ReadItems = Readonly<{
  items: ReadonlyArray<Sexp>;
  diagnostics: ReadonlyArray<SyntaxDiagnostic>;
  next: number;
  closeRange: Option<SourceRange>;
}>;

/**
 * Concatenates one read expression onto the rest of
 * its sibling run.
 */
const merge = (
  one: ReadOne,
  rest: ReadItems,
): ReadItems => ({
  items: [...one.exprs, ...rest.items],
  diagnostics: [
    ...one.diagnostics,
    ...rest.diagnostics,
  ],
  next: rest.next,
  closeRange: rest.closeRange,
});

/**
 * Reads sibling expressions starting at `from` until a
 * closing `)` (when nested) or end of input. At top
 * level a stray `)` is diagnosed
 * (`syntax.unexpected-close-paren`) and skipped so the
 * rest of the source still gets read.
 */
const readItems = (
  tokens: ReadonlyArray<Token>,
  from: number,
  topLevel: boolean,
): ReadItems =>
  pipe(
    fromNullable(tokens[from]),
    matchOption(
      (): ReadItems => ({
        items: [],
        diagnostics: [],
        next: from,
        closeRange: none(),
      }),
      (tok: Token): ReadItems =>
        match(tok)(
          [
            lParenTok$(),
            ({ content }): ReadItems =>
              listThenRest(
                tokens,
                topLevel,
                from,
                content.range,
              ),
          ],
          [
            rParenTok$(),
            ({ content }): ReadItems =>
              topLevel
                ? merge(
                    {
                      exprs: [],
                      diagnostics: [
                        syntaxError(
                          codeUnexpectedCloseParen,
                          "unexpected `)` with no open list",
                          content.range,
                        ),
                      ],
                      next: from + 1,
                    },
                    readItemsAfter(
                      tokens,
                      topLevel,
                      from + 1,
                    ),
                  )
                : {
                    items: [],
                    diagnostics: [],
                    next: from + 1,
                    closeRange: some(
                      content.range,
                    ),
                  },
          ],
          [
            symbolTok$(),
            ({ content }): ReadItems =>
              atomThenRest(
                tokens,
                topLevel,
                from,
                symbolExp(
                  content.name,
                  content.range,
                ),
              ),
          ],
          [
            strTok$(),
            ({ content }): ReadItems =>
              atomThenRest(
                tokens,
                topLevel,
                from,
                strExp(
                  content.value,
                  content.range,
                ),
              ),
          ],
          [
            numTok$(),
            ({ content }): ReadItems =>
              atomThenRest(
                tokens,
                topLevel,
                from,
                numExp(
                  content.value,
                  content.range,
                ),
              ),
          ],
          [
            boolTok$(),
            ({ content }): ReadItems =>
              atomThenRest(
                tokens,
                topLevel,
                from,
                boolExp(
                  content.value,
                  content.range,
                ),
              ),
          ],
        ),
    ),
  );

/**
 * One list expression followed by the rest of its
 * sibling run — the list is read once and its `next`
 * cursor feeds the continuation.
 */
const listThenRest = (
  tokens: ReadonlyArray<Token>,
  topLevel: boolean,
  from: number,
  openRange: SourceRange,
): ReadItems =>
  pipe(
    readList(tokens, from + 1, openRange),
    (one: ReadOne): ReadItems =>
      merge(
        one,
        readItemsAfter(
          tokens,
          topLevel,
          one.next,
        ),
      ),
  );

/**
 * Reads the rest of a sibling run after one expression
 * has been consumed.
 */
const readItemsAfter = (
  tokens: ReadonlyArray<Token>,
  topLevel: boolean,
  next: number,
): ReadItems => readItems(tokens, next, topLevel);

/**
 * One atom expression followed by the rest of its
 * sibling run.
 */
const atomThenRest = (
  tokens: ReadonlyArray<Token>,
  topLevel: boolean,
  from: number,
  exp: Sexp,
): ReadItems =>
  merge(
    {
      exprs: [exp],
      diagnostics: [],
      next: from + 1,
    },
    readItemsAfter(tokens, topLevel, from + 1),
  );

/**
 * Where an unterminated list's range ends: at the last
 * item read, or at the open paren when the list is
 * empty.
 */
const openListEnd = (
  items: ReadonlyArray<Sexp>,
  openRange: SourceRange,
): SourcePos =>
  items
    .slice(-1)
    .map((item) => sexpRange(item).end)
    .reduce((_, end) => end, openRange.end);

/**
 * Reads one list body after its `(`: the items, then
 * either the closing `)` or an unterminated-list
 * diagnostic pointing at the opener (design.md §16.1).
 */
const readList = (
  tokens: ReadonlyArray<Token>,
  from: number,
  openRange: SourceRange,
): ReadOne =>
  pipe(
    readItems(tokens, from, false),
    (inner: ReadItems): ReadOne =>
      pipe(
        inner.closeRange,
        matchOption(
          (): ReadOne => ({
            exprs: [
              listExp(
                inner.items,
                sourceRange(
                  openRange.start,
                  openListEnd(
                    inner.items,
                    openRange,
                  ),
                ),
              ),
            ],
            diagnostics: [
              ...inner.diagnostics,
              syntaxError(
                codeUnterminatedList,
                "list is not terminated before end of input",
                openRange,
              ),
            ],
            next: inner.next,
          }),
          (close: SourceRange): ReadOne => ({
            exprs: [
              listExp(
                inner.items,
                sourceRange(
                  openRange.start,
                  close.end,
                ),
              ),
            ],
            diagnostics: inner.diagnostics,
            next: inner.next,
          }),
        ),
      ),
  );

/**
 * Parses S-expression source text into position-aware
 * {@link Sexp} trees — the entry point of the syntax
 * layer. All lexical and structural diagnostics are
 * accumulated over the whole source; any diagnostic
 * makes the result an `Err` carrying every diagnostic
 * (never a throw), the shape LLM correction loops
 * consume (design.md §35).
 */
export const parseSexps = (
  source: SoftStr,
): Result<
  ReadonlyArray<Sexp>,
  ReadonlyArray<SyntaxDiagnostic>
> =>
  pipe(
    tokenize(source),
    (
      t,
    ): Result<
      ReadonlyArray<Sexp>,
      ReadonlyArray<SyntaxDiagnostic>
    > =>
      pipe(
        readItems(t.tokens, 0, true),
        (r: ReadItems) =>
          pipe(
            [...t.diagnostics, ...r.diagnostics],
            (
              all: ReadonlyArray<SyntaxDiagnostic>,
            ): Result<
              ReadonlyArray<Sexp>,
              ReadonlyArray<SyntaxDiagnostic>
            > =>
              all.length === 0
                ? ok(r.items)
                : err(all),
          ),
      ),
  );
