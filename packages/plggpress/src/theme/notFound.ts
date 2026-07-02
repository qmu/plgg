import { some, none } from "plgg";
import {
  type Html,
  div,
  h1,
  p,
  a,
  text,
  attr,
  class_,
} from "plggmatic";
import {
  type MarkdownDoc,
  frontmatter,
} from "plggmatic";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { href } from "plggpress/Href/usecase/href";
import { shell } from "plggpress/theme/shell";
import { page } from "plggpress/theme/page";

/**
 * The 404 page — ordinary prose through the SAME
 * {@link page} shell as every content page (qmu.co.jp's
 * model: its 404 is plain DocsLayout prose, sidebar
 * included, no bespoke styling). The message renders in
 * the `.vp-doc` column: a heading, one sentence, and a
 * base-prefixed link home. The `activePath` is a sentinel
 * no real route matches, so the wordmark is never marked
 * current. The synthetic {@link MarkdownDoc} carries a
 * `firstHeading` so the shell derives a meaningful
 * `<title>`.
 */
export const notFound = (
  config: SiteConfig,
): Html<never> => {
  const hrefOf = href(config.base);
  const content = div(
    [class_("vp-notfound-body")],
    [
      h1([], [text("Page not found")]),
      p(
        [],
        [
          text(
            "The page you were looking for does not exist.",
          ),
        ],
      ),
      p(
        [],
        [
          a(
            [attr("href", hrefOf("/"))],
            [text("Go to the home page")],
          ),
        ],
      ),
    ],
  );
  const body = page(
    config,
    content,
    "/404",
    config.base,
  );
  const doc: MarkdownDoc = {
    frontmatter: frontmatter(none()),
    firstHeading: some("Page not found"),
    body,
    links: [],
    slugs: [],
    headings: [],
  };
  return shell(config, doc, body);
};
