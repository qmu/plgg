import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  type Attribute,
  a,
  el,
  span,
  button,
  text,
  attr,
  href,
  class_,
} from "plgg-view";
import {
  strip,
  documentColumn,
} from "plggmatic/Navigate/model/marker";
import {
  type SidebarNavProps,
  sidebarNav,
} from "plggmatic/Component/usecase/sidebarNav";
import {
  colClass,
  foldClass,
  shareClass,
  spanTwoClass,
  shellClass,
  shellSideClass,
  shellHeadClass,
  shellTitleClass,
  shellBodyClass,
  shellBrandClass,
  shellFoldClass,
  shellFootClass,
  shellPageClass,
  docClass,
  shellMinAttr,
} from "plggmatic/Meta/model/classHooks";
import { none } from "plgg";

/**
 * One document column of the shell: the page at `route`,
 * called `title` in its head bar. `close` is the address
 * of the strip WITHOUT this column — present on the
 * RIGHTMOST column only, and not when it is the only one:
 * a strip is closed from its end, a page at a time, so a
 * reader never removes a page that others still stand to
 * the right of. `wide`
 * asks for two columns' worth (a page that is one large
 * figure or a whole screen).
 */
export type ShellPage<Msg> = Readonly<{
  route: SoftStr;
  title: SoftStr;
  close: Option<SoftStr>;
  wide: boolean;
  body: ReadonlyArray<Html<Msg>>;
}>;

/**
 * What the framework's standard screen is drawn from.
 *
 * - `brand` / `home` — the product's name and the address
 *   it leads to; `atHome` marks it current.
 * - `nav` — the sidebar's groups ({@link sidebarNav}).
 * - `folded` — whether the sidebar is folded to a strip,
 *   and `fold`, the attributes of the control that flips
 *   it (a TEA program's `onClick`; a static page leaves it
 *   empty and binds the control from a script).
 * - `foot` — what stands at the sidebar's foot: the
 *   appearance toggle.
 * - `pages` — the open document columns, left to right.
 */
export type ShellProps<Msg> = Readonly<{
  brand: SoftStr;
  home: SoftStr;
  atHome: boolean;
  nav: SidebarNavProps;
  folded: boolean;
  fold: ReadonlyArray<Attribute<Msg>>;
  foot: ReadonlyArray<Html<Msg>>;
  pages: ReadonlyArray<ShellPage<Msg>>;
}>;

const head = <Msg>(
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "header",
    [class_(shellHeadClass)],
    children,
  );

const body = <Msg>(
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el("div", [class_(shellBodyClass)], children);

const page = <Msg>(
  p: ShellPage<Msg>,
): Html<Msg> =>
  documentColumn<Msg>(
    p.route,
    none(),
    p.wide
      ? [shellPageClass, spanTwoClass]
      : [shellPageClass],
    [
      head<Msg>([
        span(
          [class_(shellTitleClass)],
          [text(p.title)],
        ),
        ...matchOption<
          SoftStr,
          ReadonlyArray<Html<Msg>>
        >(
          () => [],
          (to: SoftStr) => [
            a(
              [
                href(to),
                class_(foldClass),
                attr(
                  "aria-label",
                  "この列を閉じる",
                ),
              ],
              [text("×")],
            ),
          ],
        )(p.close),
      ]),
      body<Msg>([
        el("main", [class_(docClass)], p.body),
      ]),
    ],
  );

/**
 * THE STANDARD SCREEN. What "build it with plggmatic"
 * means when nothing else is said: a sidebar pinned on the
 * left — the product's name, its sections as groups that
 * open where the reader is, a control that folds it away,
 * the appearance toggle at its foot — and beside it the
 * pages the reader has open, sharing the width.
 *
 * One page fills the room. A link followed from it opens
 * its target to the right and the two stand side by side;
 * past what the window holds the strip scrolls and the
 * carousel steps it. Every column is the same thing: a
 * head bar that names it and a body that scrolls on its
 * own. Ruled in the text colour, square-cornered, the
 * current thing inverted — {@link shellCss} is the look.
 *
 * Pure: the same call renders a TEA view and a static
 * page. The strip it emits carries the framework's column
 * markers, so the navigation runtime, the carousel and the
 * shared-strip stylesheet all find it with no wiring.
 */
export const shell = <Msg>(
  props: ShellProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    props.folded
      ? [
          class_(shellClass),
          attr(shellMinAttr, ""),
        ]
      : [class_(shellClass)],
    [
      strip<Msg>(
        [shareClass],
        [
          el(
            "div",
            [
              class_(
                colClass + " " + shellSideClass,
              ),
            ],
            [
              head<Msg>([
                a(
                  props.atHome
                    ? [
                        href(props.home),
                        class_(shellBrandClass),
                        attr(
                          "aria-current",
                          "page",
                        ),
                      ]
                    : [
                        href(props.home),
                        class_(shellBrandClass),
                      ],
                  [text(props.brand)],
                ),
                button<Msg>(
                  [
                    attr("type", "button"),
                    class_(shellFoldClass),
                    attr(
                      "aria-label",
                      "サイドバーをたたむ",
                    ),
                    attr(
                      "aria-expanded",
                      props.folded
                        ? "false"
                        : "true",
                    ),
                    ...props.fold,
                  ],
                  [span([], [])],
                ),
              ]),
              body<Msg>([sidebarNav(props.nav)]),
              el(
                "div",
                [class_(shellFootClass)],
                props.foot,
              ),
            ],
          ),
          ...props.pages.map(page),
        ],
      ),
    ],
  );
