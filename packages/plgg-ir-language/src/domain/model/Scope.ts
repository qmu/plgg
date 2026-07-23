import {
  SoftStr,
  Option,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { SemType } from "plgg-ir-language/domain/model/SemType";
import {
  SemDiagnostic,
  semError,
  withRelated,
  codeDuplicateName,
} from "plgg-ir-language/domain/model/SemDiagnostic";

/**
 * One name declared in a scope. Bindings are **kinded**
 * (`"entity"`, `"field"`, `"policy"`, … — the kinds are
 * dialect vocabulary, the kinding is the framework's):
 * a reference of one kind never resolves to a binding
 * of another (design.md §36.4). `type` is the value
 * type expressions see; `None` means the binding names
 * something that is not a value (a view, a policy).
 */
export type Binding = Readonly<{
  kind: SoftStr;
  name: SoftStr;
  type: Option<SemType>;
  declaredAt: SourceRange;
}>;

/**
 * Builds a {@link Binding}.
 */
export const binding = (
  kind: SoftStr,
  name: SoftStr,
  type: Option<SemType>,
  declaredAt: SourceRange,
): Binding => ({ kind, name, type, declaredAt });

/**
 * A lexical/semantic scope: one frame of bindings plus
 * an optional parent, looked up innermost-first.
 * Immutable — child scopes are built, never pushed.
 */
export type Scope = Readonly<{
  parent: Option<Scope>;
  bindings: ReadonlyArray<Binding>;
}>;

/**
 * Builds a root scope (no parent).
 */
export const rootScope = (
  bindings: ReadonlyArray<Binding>,
): Scope => ({ parent: none(), bindings });

/**
 * Builds a child scope over `parent`.
 */
export const childScope =
  (parent: Scope) =>
  (bindings: ReadonlyArray<Binding>): Scope => ({
    parent: some(parent),
    bindings,
  });

/**
 * Resolves `name` as `kind`, innermost frame first.
 */
export const lookup =
  (kind: SoftStr, name: SoftStr) =>
  (scope: Scope): Option<Binding> =>
    pipe(
      fromArray(
        scope.bindings.filter(
          (b) =>
            b.kind === kind && b.name === name,
        ),
      ),
      matchOption(
        (): Option<Binding> =>
          pipe(
            scope.parent,
            matchOption(
              (): Option<Binding> => none(),
              (parent: Scope): Option<Binding> =>
                lookup(kind, name)(parent),
            ),
          ),
        (b: Binding): Option<Binding> => some(b),
      ),
    );

/**
 * Resolves `name` regardless of kind (how expression
 * references resolve — the TYPE is what matters
 * there), innermost frame first.
 */
export const lookupValue =
  (name: SoftStr) =>
  (scope: Scope): Option<Binding> =>
    pipe(
      fromArray(
        scope.bindings.filter(
          (b) => b.name === name,
        ),
      ),
      matchOption(
        (): Option<Binding> =>
          pipe(
            scope.parent,
            matchOption(
              (): Option<Binding> => none(),
              (parent: Scope): Option<Binding> =>
                lookupValue(name)(parent),
            ),
          ),
        (b: Binding): Option<Binding> => some(b),
      ),
    );

/**
 * The first element of an array as an `Option`.
 */
const fromArray = <A>(
  items: ReadonlyArray<A>,
): Option<A> =>
  items
    .slice(0, 1)
    .reduce<Option<A>>((_, v) => some(v), none());

/**
 * What merging a declaration list produces: the unique
 * bindings plus a `language.duplicate-name` diagnostic
 * for every kind+name declared twice (with the first
 * declaration as a related location).
 */
export type MergedBindings = Readonly<{
  bindings: ReadonlyArray<Binding>;
  diagnostics: ReadonlyArray<SemDiagnostic>;
}>;

/**
 * Merges declared bindings, diagnosing duplicates —
 * the declare pass's collision check.
 */
export const mergeBindings = (
  declared: ReadonlyArray<Binding>,
): MergedBindings =>
  declared.reduce<MergedBindings>(
    (acc, b) =>
      pipe(
        fromArray(
          acc.bindings.filter(
            (seen) =>
              seen.kind === b.kind &&
              seen.name === b.name,
          ),
        ),
        matchOption(
          (): MergedBindings => ({
            bindings: [...acc.bindings, b],
            diagnostics: acc.diagnostics,
          }),
          (first: Binding): MergedBindings => ({
            bindings: acc.bindings,
            diagnostics: [
              ...acc.diagnostics,
              pipe(
                semError(
                  codeDuplicateName,
                  `duplicate ${b.kind} name ${JSON.stringify(b.name)}`,
                  b.declaredAt,
                ),
                withRelated([
                  {
                    message:
                      "first declared here",
                    range: first.declaredAt,
                  },
                ]),
              ),
            ],
          }),
        ),
      ),
    { bindings: [], diagnostics: [] },
  );
