import {
  type SoftStr,
  type Result,
  ok,
  err,
  isErr,
  matchOption,
  plggErrorMessage,
} from "plgg";
import {
  parseFrontmatter,
  foldYaml,
  type YamlMap,
} from "plgg-md";
import {
  type ContentModelBinding,
} from "plggpress/ContentModel/model/ContentModel";
import {
  type ModelViolation,
  type ModelViolations,
  modelViolations,
} from "plggpress/ContentModel/model/ModelViolation";
import { casterOf } from "plggpress/ContentModel/usecase/casterOf";

/** A discovered content page — its route path and source. */
export type Page = Readonly<{
  path: SoftStr;
  source: SoftStr;
}>;

/** Whether a model declares any required field. */
const hasRequired = (
  binding: ContentModelBinding,
): boolean =>
  binding.model.fields.some(
    (f) => f.required,
  );

/** Checks one page against one binding, collecting violations. */
const checkPage = (
  page: Page,
  binding: ContentModelBinding,
): ReadonlyArray<ModelViolation> => {
  const parsed = parseFrontmatter(page.source);
  if (isErr(parsed)) {
    return [
      {
        path: page.path,
        reason: `frontmatter syntax: ${plggErrorMessage(parsed.content)}`,
      },
    ];
  }
  return matchOption<
    YamlMap,
    ReadonlyArray<ModelViolation>
  >(
    () =>
      hasRequired(binding)
        ? [
            {
              path: page.path,
              reason: `missing frontmatter for model ${JSON.stringify(binding.model.name)}`,
            },
          ]
        : [],
    (map: YamlMap) => {
      const validated = casterOf(binding.model)(
        foldYaml(map),
      );
      return isErr(validated)
        ? [
            {
              path: page.path,
              reason: plggErrorMessage(
                validated.content,
              ),
            },
          ]
        : [];
    },
  )(parsed.content.frontmatter.data);
};

/**
 * Build-time content-model validation (D8) — the
 * model-check pass mirroring `checkLinks`. For every page
 * under a binding's directory prefix, parses the
 * frontmatter, folds it to plain data, and runs the
 * model's caster, collecting ALL violations (not
 * first-failure) into a {@link ModelViolations}. `Ok(null)`
 * when the corpus is clean.
 */
export const checkModels = (
  pages: ReadonlyArray<Page>,
  bindings: ReadonlyArray<ContentModelBinding>,
): Result<null, ModelViolations> => {
  const violations = pages.flatMap(
    (page: Page) =>
      bindings
        .filter((b: ContentModelBinding) =>
          page.path.startsWith(b.prefix),
        )
        .flatMap((b: ContentModelBinding) =>
          checkPage(page, b),
        ),
  );
  return violations.length === 0
    ? ok(null)
    : err(modelViolations(violations));
};
