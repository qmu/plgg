import {
  SoftStr,
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  pipe,
} from "plgg";
import {
  Dialect,
  Language,
} from "plgg-ir-language/domain/model/Language";

/**
 * Names that appear more than once in a registry.
 */
const collisions = (
  names: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> =>
  names.filter(
    (name, i) => names.indexOf(name) !== i,
  );

/**
 * Composes dialects into one {@link Language}
 * (design.md §24): registries are concatenated, and a
 * name registered twice in the same registry is a
 * composition error — vocabulary stays closed and
 * unambiguous. Composition failure is a programming
 * error (an `InvalidError`), not a source diagnostic.
 */
export const compose = <N>(
  ...dialects: ReadonlyArray<Dialect<N>>
): Result<Language<N>, InvalidError> =>
  pipe(
    {
      forms: dialects.flatMap((d) => d.forms),
      operators: dialects.flatMap(
        (d) => d.operators,
      ),
      expanders: dialects.flatMap(
        (d) => d.expanders,
      ),
      normalizers: dialects.flatMap(
        (d) => d.normalizers,
      ),
    },
    (
      language: Language<N>,
    ): Result<Language<N>, InvalidError> =>
      pipe(
        [
          ...collisions(
            language.forms.map((f) => f.name),
          ).map((n) => `form ${n}`),
          ...collisions(
            language.operators.map((o) => o.name),
          ).map((n) => `operator ${n}`),
          ...collisions(
            language.expanders.map((e) => e.name),
          ).map((n) => `expander ${n}`),
          ...collisions(
            language.normalizers.map(
              (n) => n.name,
            ),
          ).map((n) => `normalizer ${n}`),
        ],
        (
          collided: ReadonlyArray<SoftStr>,
        ): Result<Language<N>, InvalidError> =>
          collided.length === 0
            ? ok(language)
            : err(
                invalidError({
                  message: `dialect composition collides on: ${collided.join(", ")}`,
                }),
              ),
      ),
  );
