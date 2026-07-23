import { pipe, mapResult } from "plgg";
import {
  Dialect,
  FormDef,
} from "plgg-ir-language/domain/model/Language";
import { contextOf } from "plgg-ir-language/domain/usecase/analyze";

/**
 * Lifts a dialect to a wider node type so it can join
 * a heterogeneous composition. `Dialect<N>` is
 * invariant in `N` (a form's `AnalysisContext<N>`
 * carries `N` in both positions), so a dialect written
 * at its own node type cannot be passed to `compose`
 * at a union directly — this functor is the supported
 * seam (design.md §24).
 *
 * A mapped form analyzes with its OWN dialect's closed
 * vocabulary, in the scope of the composition: scope
 * (and with it cross-dialect references) flows
 * through; forms, operators, and nested-form recursion
 * stay the dialect's own. Composing dialects adds
 * forms alongside a vocabulary — it never reaches
 * inside one.
 */
export const mapDialect =
  <A, B>(embed: (node: A) => B) =>
  (dialect: Dialect<A>): Dialect<B> => ({
    name: dialect.name,
    forms: dialect.forms.map(
      mapForm(dialect, embed),
    ),
    operators: dialect.operators,
    expanders: dialect.expanders,
    normalizers: dialect.normalizers,
  });

/**
 * Lifts one form: analysis runs against the original
 * dialect's own context at the composition's scope,
 * and the produced node is embedded.
 */
const mapForm =
  <A, B>(
    dialect: Dialect<A>,
    embed: (node: A) => B,
  ) =>
  (def: FormDef<A>): FormDef<B> => ({
    name: def.name,
    declare: def.declare,
    analyze: (form, ctx) =>
      pipe(
        def.analyze(
          form,
          contextOf(dialect, ctx.scope),
        ),
        mapResult(embed),
      ),
  });
