import { SoftStr, Option } from "plgg";
import { Html } from "plgg-view";
import { Frontmatter } from "plgg-md/Frontmatter/model/Frontmatter";
import { HeadingLevel } from "plgg-md/Block/model/Block";
import { Ordinal } from "plgg-md/Render/model/seam";

/**
 * One document heading as pure data: its ATX depth, its
 * plain text, the slug `id` the renderer stamped on the
 * emitted element — the exact anchor a table of contents
 * links to (`#slug`) — and its {@link Ordinal}, the outline
 * position the body's heading carries.
 *
 * The list on {@link MarkdownDoc} is in document order. It
 * is built by a SEPARATE traversal from the body's, so the
 * two agree not by sharing state but because both slugging
 * and counting are deterministic functions of the heading
 * sequence, and both traversals walk the identical
 * sequence. That is the invariant to preserve: anything
 * added here must be a function of the sequence, never of
 * who happened to render first.
 */
export type MdHeading = Readonly<{
  level: HeadingLevel;
  text: SoftStr;
  slug: SoftStr;
  ordinal: Ordinal;
}>;

/**
 * A fully rendered Markdown page as **pure data**: its
 * {@link Frontmatter} flag, the first H1's plain text (so
 * the theme can derive `<title>`; `None` for the
 * home/no-H1 case — see `spike-decisions.md` §6e), the
 * `plgg-view` body tree (an `Html<never>` ready for
 * `renderToString`/`collectCss`), and three flat surfaces
 * for `plggpress`'s tooling: every emitted link target
 * (`links`, post-resolver), every heading id (`slugs`,
 * exactly the ids carried in `body`) for its dead-link
 * checker, and the typed heading list (`headings`, same
 * order and slugs) for a table of contents.
 */
export type MarkdownDoc = Readonly<{
  frontmatter: Frontmatter;
  firstHeading: Option<SoftStr>;
  body: Html<never>;
  links: ReadonlyArray<SoftStr>;
  slugs: ReadonlyArray<SoftStr>;
  headings: ReadonlyArray<MdHeading>;
}>;
