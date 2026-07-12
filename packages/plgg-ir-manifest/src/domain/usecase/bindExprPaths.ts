import {
  SoftStr,
  Result,
  ok,
  some,
  none,
  pipe,
  match,
  mapResult,
} from "plgg";
import {
  Sexp,
  sexpRange,
  symbolExp$,
  strExp$,
  numExp$,
  boolExp$,
  listExp$,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  Scope,
  Binding,
  binding,
  childScope,
  nominalType,
  allOrErrors,
} from "plgg-ir-language";
import {
  PathRoot,
  ResolvedPath,
  isValueTerminal,
} from "plgg-ir-manifest/domain/model/Path";
import { Module } from "plgg-ir-manifest/domain/model/Module";
import {
  resolvePath,
  rootName,
} from "plgg-ir-manifest/domain/usecase/resolvePath";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Every symbol name mentioned anywhere in an
 * expression tree, with the range of its first
 * occurrence.
 */
const symbolsIn = (
  exp: Sexp,
): ReadonlyArray<
  Readonly<{ name: SoftStr; exp: Sexp }>
> =>
  match(exp)(
    [
      symbolExp$(),
      ({
        content,
      }): ReadonlyArray<
        Readonly<{ name: SoftStr; exp: Sexp }>
      > => [{ name: content.name, exp }],
    ],
    [
      strExp$(),
      (): ReadonlyArray<
        Readonly<{ name: SoftStr; exp: Sexp }>
      > => [],
    ],
    [
      numExp$(),
      (): ReadonlyArray<
        Readonly<{ name: SoftStr; exp: Sexp }>
      > => [],
    ],
    [
      boolExp$(),
      (): ReadonlyArray<
        Readonly<{ name: SoftStr; exp: Sexp }>
      > => [],
    ],
    [
      listExp$(),
      ({
        content,
      }): ReadonlyArray<
        Readonly<{ name: SoftStr; exp: Sexp }>
      > =>
        // the head is an operator position — only
        // argument symbols are path candidates
        content.items.slice(1).flatMap(symbolsIn),
    ],
  );

/**
 * Builds the scope a manifest expression is checked
 * in: every dotted path mentioned in the expression
 * is resolved against the available roots (design.md
 * §14) and bound with its value type, and every bare
 * root alias is bound (`actor` carries the nominal
 * type `actor` so `has-role` can require it). Path
 * resolution failures accumulate — the framework's
 * checker then works on plain bindings.
 */
export const scopeWithPaths =
  (
    m: Module,
    roots: ReadonlyArray<PathRoot>,
    base: Scope,
  ) =>
  (exp: Sexp): Result<Scope, Diags> =>
    pipe(
      symbolsIn(exp)
        .filter(
          (s, i, all) =>
            all.findIndex(
              (o) => o.name === s.name,
            ) === i,
        )
        .filter(
          (s) =>
            s.name.includes(".") ||
            roots.some(
              (r) => rootName(r) === s.name,
            ),
        ),
      (candidates) =>
        pipe(
          allOrErrors(
            candidates.map(
              (c): Result<Binding, Diags> =>
                c.name.includes(".")
                  ? pipe(
                      resolvePath(m, roots)(
                        c.name,
                        sexpRange(c.exp),
                      ),
                      mapResult(
                        (
                          p: ResolvedPath,
                        ): Binding =>
                          binding(
                            "path",
                            c.name,
                            isValueTerminal(
                              p.terminal,
                            )
                              ? some(
                                  p.terminal
                                    .content.type,
                                )
                              : none(),
                            sexpRange(c.exp),
                          ),
                      ),
                    )
                  : ok(
                      binding(
                        "alias",
                        c.name,
                        some(nominalType(c.name)),
                        sexpRange(c.exp),
                      ),
                    ),
            ),
          ),
          mapResult(
            (
              bindings: ReadonlyArray<Binding>,
            ): Scope =>
              childScope(base)(bindings),
          ),
        ),
    );
