import { feedback } from "../catalog/parts.ts";
import { HOME } from "../catalog/address.ts";
import {
  type Locale,
  baseOf,
  localeOf,
} from "../catalog/locale.ts";
import {
  type SoftStr,
  type Option,
  fromNullable,
  matchOption,
} from "plgg";
import {
  type Html,
  a,
  el,
  text,
  attr,
  href,
  raw,
  renderToString,
} from "plgg-view";
import { makeUrl } from "plgg-view/client";
import {
  type Model,
  type Msg,
} from "../catalog/model.ts";
import {
  type Page,
  pagesFor,
} from "../catalog/pages.ts";
import { init } from "../catalog/app.ts";

/**
 * THE GUIDE AS A SITE OF PAGES. Each page of the catalog
 * is a page of a plggpress site: drawn as it is built, so
 * it reads with no script, and then taken over by the
 * same program the catalog runs, so its examples can be
 * operated. One page stands in one column; a link to
 * another page is an ordinary link, which the site opens
 * beside it.
 */
const pageOf = (
  id: SoftStr,
  locale: Locale,
): Option<Page> =>
  fromNullable(
    pagesFor(locale).find(
      (p: Page) => p.id === id,
    ),
  );

/** The address of a page of the site. */
export const routeOf = (id: SoftStr) =>
  id === HOME ? "/" : "/" + id + "/";
export const addressOf = (
  id: SoftStr,
  locale: Locale,
) => baseOf(locale) + routeOf(id).slice(1);
export const pageRef = (code: string) => {
  const [edition, id] = code.trim().split("/");
  return {
    locale: localeOf(edition),
    id: id ?? HOME,
  };
};
export const firstModel = (
  locale: Locale,
): Model => ({
  ...init(makeUrl("/", ""))[0],
  locale,
});

/** A page's body without its own title: the site's
 * column names the page already. */
const untitled = (
  nodes: ReadonlyArray<Html<Msg>>,
): ReadonlyArray<Html<Msg>> =>
  nodes.filter(
    (node: Html<Msg>, i: number) =>
      !(
        i === 0 &&
        node.__tag === "Element" &&
        node.content.tag === "h1"
      ),
  );

/** One page as it stands in its column: its body, and
 * the notices its examples raise. */
export const pageHtml = (
  model: Model,
  id: SoftStr,
): Html<Msg> =>
  el(
    "div",
    [attr("lang", model.locale)],
    [
      ...matchOption<
        Page,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (page: Page) =>
          untitled(
            page.body({
              model,
              assetBase: "/",
              hrefTo: (id) =>
                addressOf(id, model.locale),
              link: (target, label) =>
                a<Msg>(
                  [
                    href(
                      addressOf(
                        target,
                        model.locale,
                      ),
                    ),
                  ],
                  [text(label)],
                ),
            }),
          ),
      )(pageOf(id, model.locale)),
      ...feedback(model),
    ],
  );

/** The page as the site builds it: already drawn. Only
 * the escaped plgg-view result enters `raw`. */
export const pageWidget = (
  code: string,
): Html<never> => {
  const { id, locale } = pageRef(code);
  return raw(
    renderToString(
      pageHtml(firstModel(locale), id),
    ),
  );
};
