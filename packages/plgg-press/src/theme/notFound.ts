import { some, none } from "plgg";
import {
  type Html,
  div,
  section,
  h1,
  p,
  a,
  text,
  attr,
} from "plgg-view";
import {
  style_,
  py,
  px,
  mb,
  center,
  color,
  weight,
  text as fontSize,
} from "plgg-view/style";
import {
  type MarkdownDoc,
  frontmatter,
} from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { href } from "plgg-press/Href/usecase/href";
import { shell } from "plgg-press/theme/shell";
import { navBar } from "plgg-press/theme/navBar";

/**
 * The 404 page, rendered through the SAME document
 * {@link shell} as every content page so it inherits the
 * site chrome and style injection. Its nav links are
 * base-prefixed via {@link navBar} (the build ticket
 * persists this with `write404`, and the dead-link
 * checker excludes it from route expectations). The
 * `activePath` is a sentinel no real route matches, so no
 * nav entry is marked current. The synthetic
 * {@link MarkdownDoc} carries a `firstHeading` so the
 * shell derives a meaningful `<title>`.
 */
export const notFound = (
  config: SiteConfig,
): Html<never> => {
  const hrefOf = href(config.base);
  const body = div(
    [],
    [
      navBar(config, "/404"),
      section(
        [style_(py(16), px(4), center)],
        [
          h1(
            [
              style_(
                fontSize("2xl"),
                weight(400),
                mb(4),
              ),
            ],
            [text("Page not found")],
          ),
          p(
            [style_(color("muted"), mb(8))],
            [
              text(
                "The page you were looking for does not exist.",
              ),
            ],
          ),
          a(
            [
              attr("href", hrefOf("/")),
              style_(
                color("text"),
                weight(400),
              ),
            ],
            [text("Go to the home page")],
          ),
        ],
      ),
    ],
  );
  const doc: MarkdownDoc = {
    frontmatter: frontmatter(none()),
    firstHeading: some("Page not found"),
    body,
    links: [],
    slugs: [],
  };
  return shell(config, doc, body);
};
