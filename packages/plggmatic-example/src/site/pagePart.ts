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
import { toast, toasterClass } from "plggmatic";
import {
  type Model,
  type Msg,
  type Shown,
  msg,
} from "../catalog/model.ts";
import {
  type Page,
  pages,
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
export const pageOf = (
  id: SoftStr,
): Option<Page> =>
  fromNullable(
    pages.find((p: Page) => p.id === id),
  );

/** The address of a page of the site. */
export const addressOf = (id: SoftStr): SoftStr =>
  `/${id}/`;

const link = (
  id: SoftStr,
  label: SoftStr,
): Html<Msg> =>
  a<Msg>([href(addressOf(id))], [text(label)]);

/** What every page starts from. */
export const firstModel = (): Model =>
  init(makeUrl("/", ""))[0];

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
    [],
    [
      ...matchOption<
        Page,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (page: Page) =>
          untitled(page.body({ model, link })),
      )(pageOf(id)),
      el(
        "div",
        [
          attr("class", toasterClass),
          attr("aria-live", "polite"),
        ],
        model.shown.map((s: Shown) =>
          toast<Msg>({
            id: s.id,
            tone: s.tone,
            message: s.message,
            onDismiss: msg.dismiss(s.id),
          }),
        ),
      ),
    ],
  );

/** The page as the site builds it: already drawn. Only
 * the escaped plgg-view result enters `raw`. */
export const pageWidget = (
  id: SoftStr,
): Html<never> =>
  raw(renderToString(pageHtml(firstModel(), id)));
