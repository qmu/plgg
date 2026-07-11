import {
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  match,
  matchOption,
  chainResult,
  mapResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isSymbolExp,
  symbolExp$,
  strExp$,
  numExp$,
  boolExp$,
  listExp$,
} from "plgg-ir-syntax";
import {
  booleanType,
  integerType,
  decimalType,
  stringType,
} from "plgg-ir-language/domain/model/SemType";
import {
  SemDiagnostic,
  semError,
  codeUnknownOperator,
  codeUnknownName,
  codeInvalidExpression,
  codeUntypedReference,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Scope,
  Binding,
  lookupValue,
} from "plgg-ir-language/domain/model/Scope";
import {
  TypedExpr,
  litExpr,
  refExpr,
  appExpr,
  typedRef,
  typedExprType,
} from "plgg-ir-language/domain/model/TypedExpr";
import {
  Language,
  OperatorDef,
  findOperator,
} from "plgg-ir-language/domain/model/Language";
import { allOrErrors } from "plgg-ir-language/domain/usecase/accumulate";

/**
 * The checker's result shape.
 */
type Checked = Result<
  TypedExpr,
  ReadonlyArray<SemDiagnostic>
>;

/**
 * The head of an expression list, when it is a symbol.
 */
const symbolHead = (
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
 * Checks an operator application: every operand is
 * checked first (accumulating diagnostics across ALL
 * operands), then the operator's typing rule runs on
 * the operand types.
 */
const checkApp =
  <N>(language: Language<N>, scope: Scope) =>
  (list: ListExp, op: OperatorDef): Checked =>
    pipe(
      allOrErrors(
        list.content.items
          .slice(1)
          .map((arg) =>
            checkExprOf(language)(arg, scope),
          ),
      ),
      chainResult(
        (args: ReadonlyArray<TypedExpr>) =>
          pipe(
            op.check(
              args.map(typedExprType),
              list.content.range,
            ),
            mapResult((type): TypedExpr =>
              appExpr(
                op.name,
                args,
                type,
                list.content.range,
              ),
            ),
          ),
      ),
    );

/**
 * Type-checks one expression against a scope
 * (design.md §8, §16.4): literals type themselves
 * (integer literals also satisfy decimal via
 * assignability), symbols resolve to typed references,
 * lists apply registered operators. Unknown operators
 * and unknown names are compile errors — the
 * vocabulary is closed (design.md §36.3).
 */
export const checkExprOf =
  <N>(language: Language<N>) =>
  (exp: Sexp, scope: Scope): Checked =>
    match(exp)(
      [
        numExp$(),
        ({ content }): Checked =>
          ok(
            litExpr(
              Number.isInteger(content.value)
                ? integerType
                : decimalType,
              exp,
            ),
          ),
      ],
      [
        strExp$(),
        (): Checked =>
          ok(litExpr(stringType, exp)),
      ],
      [
        boolExp$(),
        (): Checked =>
          ok(litExpr(booleanType, exp)),
      ],
      [
        symbolExp$(),
        ({ content }): Checked =>
          pipe(
            lookupValue(content.name)(scope),
            matchOption(
              (): Checked =>
                err([
                  semError(
                    codeUnknownName,
                    `unknown name ${JSON.stringify(content.name)}`,
                    content.range,
                  ),
                ]),
              (b: Binding): Checked =>
                pipe(
                  b.type,
                  matchOption(
                    (): Checked =>
                      err([
                        semError(
                          codeUntypedReference,
                          `${b.kind} ${JSON.stringify(b.name)} has no value type and cannot appear in an expression`,
                          content.range,
                        ),
                      ]),
                    (type): Checked =>
                      ok(
                        refExpr(
                          typedRef(
                            b.kind,
                            b.name,
                            type,
                            b.declaredAt,
                            content.range,
                          ),
                        ),
                      ),
                  ),
                ),
            ),
          ),
      ],
      [
        listExp$(),
        (list: ListExp): Checked =>
          pipe(
            symbolHead(list),
            matchOption(
              (): Checked =>
                err([
                  semError(
                    codeInvalidExpression,
                    "an expression list must start with an operator symbol",
                    list.content.range,
                  ),
                ]),
              (head: SymbolExp): Checked =>
                pipe(
                  findOperator(
                    language,
                    head.content.name,
                  ),
                  matchOption(
                    (): Checked =>
                      err([
                        semError(
                          codeUnknownOperator,
                          `unknown operator ${JSON.stringify(head.content.name)}`,
                          head.content.range,
                        ),
                      ]),
                    (op: OperatorDef): Checked =>
                      checkApp(language, scope)(
                        list,
                        op,
                      ),
                  ),
                ),
            ),
          ),
      ],
    );
