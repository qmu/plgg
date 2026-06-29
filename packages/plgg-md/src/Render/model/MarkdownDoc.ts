import { SoftStr, Option } from "plgg";
import { Html } from "plgg-view";
import { Frontmatter } from "plgg-md/Frontmatter/model/Frontmatter";

/**
 * A fully rendered Markdown page as **pure data**: its
 * {@link Frontmatter} flag, the first H1's plain text (so
 * the theme can derive `<title>`; `None` for the
 * home/no-H1 case — see `spike-decisions.md` §6e), the
 * `plgg-view` body tree (an `Html<never>` ready for
 * `renderToString`/`collectCss`), and two flat surfaces
 * for `plgg-press`'s tooling: every emitted link target
 * (`links`, post-resolver) and every heading id (`slugs`,
 * exactly the ids carried in `body`) for its dead-link
 * checker.
 */
export type MarkdownDoc = Readonly<{
  frontmatter: Frontmatter;
  firstHeading: Option<SoftStr>;
  body: Html<never>;
  links: ReadonlyArray<SoftStr>;
  slugs: ReadonlyArray<SoftStr>;
}>;
