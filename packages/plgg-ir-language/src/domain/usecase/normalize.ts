import { SoftStr, pipe } from "plgg";
import { Sexp, printSexps } from "plgg-ir-syntax";
import { Language } from "plgg-ir-language/domain/model/Language";

/**
 * The normalize pass (design.md §16.10, §33): every
 * registered normalizer applied in registration order
 * to each top-level expression. Each rule is a total,
 * deterministic `Sexp → Sexp` rewrite; the composed
 * pass must be idempotent
 * (`normalize(normalize(x)) = normalize(x)`), which
 * each dialect proves by property test.
 */
export const normalizeSexps =
  <N>(language: Language<N>) =>
  (
    exprs: ReadonlyArray<Sexp>,
  ): ReadonlyArray<Sexp> =>
    exprs.map((exp) =>
      language.normalizers.reduce(
        (acc, normalizer) =>
          normalizer.apply(acc),
        exp,
      ),
    );

/**
 * The canonical serializer: normalized trees printed
 * as canonical text. Deterministic — equivalent
 * sources produce identical canonical output, enabling
 * caching, diffing, and content hashing (design.md
 * §33).
 */
export const canonicalText =
  <N>(language: Language<N>) =>
  (exprs: ReadonlyArray<Sexp>): SoftStr =>
    pipe(
      normalizeSexps(language)(exprs),
      printSexps,
    );
