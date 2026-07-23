import {
  type SoftStr,
  type Result,
  type InvalidError,
  invalidError,
  some,
  none,
  ok,
  err,
  pipe,
  isErr,
  fromNullable,
  getOr,
} from "plgg";
import {
  type Frontmatter,
  frontmatter,
} from "plgg-md/Frontmatter/model/Frontmatter";
import { parseYamlSubset } from "plgg-md/Yaml/usecase/parseYamlSubset";

/**
 * A source split into its {@link Frontmatter} (the full
 * parsed YAML-subset block, D8) and the remaining Markdown
 * body.
 */
export type ParsedDocument = Readonly<{
  frontmatter: Frontmatter;
  body: SoftStr;
}>;

/** The bare frontmatter fence line. */
const FENCE = "---";

/**
 * Splits a leading `---`…`---` frontmatter block off a
 * source and parses it against the YAML SUBSET
 * ({@link parseYamlSubset}). A source without a leading
 * fence is returned verbatim with `None` data. An
 * opened-but-never-closed fence is a failure; a MALFORMED
 * block is now a POSITIONED `Err` (no longer silently
 * stripped) — the "precise errors" of D8. Total: never
 * throws.
 */
export const parseFrontmatter = (
  source: SoftStr,
): Result<ParsedDocument, InvalidError> => {
  const lines = source.split("\n");
  const first = pipe(
    fromNullable(lines[0]),
    getOr(""),
  );
  if (first.trim() !== FENCE) {
    return ok({
      frontmatter: frontmatter(none()),
      body: source,
    });
  }
  const closeRel = lines
    .slice(1)
    .findIndex(
      (line: SoftStr) => line.trim() === FENCE,
    );
  if (closeRel < 0) {
    return err(
      invalidError({
        message:
          "Unterminated frontmatter: opening '---' has no closing '---'",
      }),
    );
  }
  const closeIdx = closeRel + 1;
  const block = lines
    .slice(1, closeIdx)
    .join("\n");
  const parsed = parseYamlSubset(block);
  return isErr(parsed)
    ? err(parsed.content)
    : ok({
        frontmatter: frontmatter(
          some(parsed.content),
        ),
        body: lines
          .slice(closeIdx + 1)
          .join("\n"),
      });
};
