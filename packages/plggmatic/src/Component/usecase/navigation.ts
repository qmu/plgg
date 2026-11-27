import { type SoftStr } from "plgg";
import {
  type Html,
  el,
  text,
  attr,
  onClick,
} from "plgg-view";
import {
  accordionBodyClass,
  accordionClass,
  accordionItemClass,
  iconButtonClass,
  menuButtonClass,
  menuItemClass,
  menuListClass,
  pagerClass,
  pagerItemClass,
  stepClass,
  stepsClass,
  tabClass,
  tabsClass,
} from "plggmatic/Meta/model/classHooks";

/** One of a set of things chosen between. */
export type Selectable = Readonly<{
  id: SoftStr;
  label: SoftStr;
}>;

/**
 * TABS: one place, several contents, one shown. The
 * component draws the row of tabs and says which is
 * current; the content under it is the caller's, chosen
 * by the same `current`.
 */
export type TabsProps<Msg> = Readonly<{
  label: SoftStr;
  items: ReadonlyArray<Selectable>;
  current: SoftStr;
  onSelect: (id: SoftStr) => Msg;
}>;
export const tabs = <Msg>(
  props: TabsProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", tabsClass),
      attr("role", "tablist"),
      attr("aria-label", props.label),
    ],
    props.items.map((item: Selectable) =>
      el(
        "button",
        [
          attr("type", "button"),
          attr("class", tabClass),
          attr("role", "tab"),
          attr(
            "aria-selected",
            item.id === props.current
              ? "true"
              : "false",
          ),
          onClick(props.onSelect(item.id)),
        ],
        [text(item.label)],
      ),
    ),
  );

/** The page numbers shown around the current one: the
 * first, the last, and those next to where one stands;
 * a gap is a zero. */
export const pageNumbers = (
  page: number,
  pages: number,
): ReadonlyArray<number> =>
  Array.from(
    { length: Math.max(0, pages) },
    (_: unknown, i: number) => i + 1,
  )
    .filter(
      (n: number) =>
        n === 1 ||
        n === pages ||
        Math.abs(n - page) <= 1,
    )
    .flatMap(
      (
        n: number,
        i: number,
        shown: ReadonlyArray<number>,
      ) =>
        i > 0 &&
        shown.some(
          (before: number, at: number) =>
            at === i - 1 && n - before > 1,
        )
          ? [0, n]
          : [n],
    );

/**
 * PAGINATION: a long list taken a page at a time. The
 * ends cannot be stepped past: there the step button is
 * really disabled.
 */
export type PaginationProps<Msg> = Readonly<{
  label: SoftStr;
  page: number;
  pages: number;
  onGo: (page: number) => Msg;
}>;
const step = <Msg>(
  props: PaginationProps<Msg>,
  to: number,
  glyph: SoftStr,
  name: SoftStr,
): Html<Msg> =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", pagerItemClass),
      attr("aria-label", name),
      ...(to < 1 || to > props.pages
        ? [attr("disabled", "")]
        : [onClick(props.onGo(to))]),
    ],
    [text(glyph)],
  );
export const pagination = <Msg>(
  props: PaginationProps<Msg>,
): Html<Msg> =>
  el(
    "nav",
    [
      attr("class", pagerClass),
      attr("aria-label", props.label),
    ],
    [
      step(
        props,
        props.page - 1,
        "‹",
        "前のページ",
      ),
      ...pageNumbers(props.page, props.pages).map(
        (n: number) =>
          n === 0
            ? el<Msg>(
                "span",
                [attr("aria-hidden", "true")],
                [text("…")],
              )
            : el<Msg>(
                "button",
                [
                  attr("type", "button"),
                  attr("class", pagerItemClass),
                  ...(n === props.page
                    ? [
                        attr(
                          "aria-current",
                          "page",
                        ),
                      ]
                    : [onClick(props.onGo(n))]),
                ],
                [text(String(n))],
              ),
      ),
      step(
        props,
        props.page + 1,
        "›",
        "次のページ",
      ),
    ],
  );

/**
 * STEPS: where one stands in a procedure. Steps before
 * the current one are done; the current is marked; the
 * rest are still to come. `current` counts from zero.
 */
export type StepsProps = Readonly<{
  label: SoftStr;
  items: ReadonlyArray<SoftStr>;
  current: number;
}>;
export const steps = <Msg>(
  props: StepsProps,
): Html<Msg> =>
  el(
    "ol",
    [
      attr("class", stepsClass),
      attr("aria-label", props.label),
    ],
    props.items.map((name: SoftStr, i: number) =>
      el(
        "li",
        [
          attr("class", stepClass),
          ...(i === props.current
            ? [attr("aria-current", "step")]
            : i < props.current
              ? [attr("data-done", "")]
              : []),
        ],
        [text(name)],
      ),
    ),
  );

/**
 * AN ACCORDION: sections that open and close under
 * their headings. Built on the native disclosure, so it
 * works with no script and is found by page search.
 */
export type AccordionItem<Msg> = Readonly<{
  title: SoftStr;
  open: boolean;
  body: ReadonlyArray<Html<Msg>>;
}>;
export const accordion = <Msg>(
  items: ReadonlyArray<AccordionItem<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", accordionClass)],
    items.map((item: AccordionItem<Msg>) =>
      el(
        "details",
        [
          attr("class", accordionItemClass),
          ...(item.open
            ? [attr("open", "")]
            : []),
        ],
        [
          el("summary", [], [text(item.title)]),
          el(
            "div",
            [attr("class", accordionBodyClass)],
            item.body,
          ),
        ],
      ),
    ),
  );

/**
 * A MENU: a button that lets a list of choices down.
 * Built on the native disclosure: it opens on a press
 * or Enter with no script. A choice that destroys
 * something is marked so.
 */
export type MenuItem<Msg> = Readonly<{
  label: SoftStr;
  onPress: Msg;
  danger: boolean;
}>;
export type MenuProps<Msg> = Readonly<{
  label: SoftStr;
  items: ReadonlyArray<MenuItem<Msg>>;
}>;
export const menuButton = <Msg>(
  props: MenuProps<Msg>,
): Html<Msg> =>
  el(
    "details",
    [attr("class", menuButtonClass)],
    [
      el("summary", [], [text(props.label)]),
      el(
        "div",
        [
          attr("class", menuListClass),
          attr("role", "menu"),
        ],
        props.items.map((item: MenuItem<Msg>) =>
          el(
            "button",
            [
              attr("type", "button"),
              attr("class", menuItemClass),
              attr("role", "menuitem"),
              ...(item.danger
                ? [attr("data-danger", "")]
                : []),
              onClick(item.onPress),
            ],
            [text(item.label)],
          ),
        ),
      ),
    ],
  );

/**
 * AN ICON BUTTON: a button of a glyph alone. The glyph
 * says nothing to a screen reader, so the label is not
 * optional.
 */
export type IconButtonProps<Msg> = Readonly<{
  label: SoftStr;
  glyph: SoftStr;
  onPress: Msg;
  disabled: boolean;
}>;
export const iconButton = <Msg>(
  props: IconButtonProps<Msg>,
): Html<Msg> =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", iconButtonClass),
      attr("aria-label", props.label),
      ...(props.disabled
        ? [attr("disabled", "")]
        : [onClick(props.onPress)]),
    ],
    [
      el(
        "span",
        [attr("aria-hidden", "true")],
        [text(props.glyph)],
      ),
    ],
  );
