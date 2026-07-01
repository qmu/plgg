import {
  SoftStr,
  Result,
  InvalidError,
  invalidError,
  some,
  none,
  ok,
  err,
  pipe,
  fromNullable,
  getOr,
} from "plgg";
import {
  Frontmatter,
  frontmatter,
} from "plgg-md/Frontmatter/model/Frontmatter";

/**
 * A source split into its (layout-marker-only)
 * {@link Frontmatter} and the remaining Markdown body.
 */
export type ParsedDocument = Readonly<{
  frontmatter: Frontmatter;
  body: SoftStr;
}>;

/** The bare frontmatter fence line. */
const FENCE = "---";

/** The single flat marker we detect; nested YAML is ignored. */
const LAYOUT_HOME_RE = /^layout:\s*home\s*$/;

/**
 * Splits a leading `---`…`---` frontmatter block off a
 * source, detecting only the flat `layout: home` marker
 * and stripping the rest of the block (no nested-YAML
 * parsing — see `spike-decisions.md` §6b). Returns the
 * {@link Frontmatter} flag plus the body after the
 * closing fence. A source without a leading fence is
 * returned verbatim with an empty (`None`) layout. An
 * opened-but-never-closed fence is a failure, not a
 * throw.
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
  const layout = lines
    .slice(1, closeIdx)
    .some((line: SoftStr) =>
      LAYOUT_HOME_RE.test(line.trim()),
    )
    ? some<SoftStr>("home")
    : none();
  return ok({
    frontmatter: frontmatter(layout),
    body: lines.slice(closeIdx + 1).join("\n"),
  });
};
