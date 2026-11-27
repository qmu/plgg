import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  el,
  text,
  attr,
  onClick,
} from "plgg-view";
import { type Tone } from "plggmatic/Component/usecase/toast";
import {
  avatarClass,
  badgeClass,
  badgeToneClass,
  cardBodyClass,
  cardClass,
  cardFootClass,
  cardHeadClass,
  codeBlockClass,
  descClass,
  dividerClass,
  emptyClass,
  emptyTitleClass,
  itemsClass,
  itemsRowClass,
  itemsNoteClass,
  itemsTitleClass,
  itemsTrailClass,
  numericClass,
  tableClass,
  tableWrapClass,
  tagClass,
  tagRemoveClass,
} from "plggmatic/Meta/model/classHooks";

/**
 * A BADGE: a small mark of state or count beside the
 * thing it speaks of. With no tone it is drawn in the
 * text's own ink.
 */
export type BadgeProps = Readonly<{
  label: SoftStr;
  tone: Option<Tone>;
}>;
export const badge = <Msg>(
  props: BadgeProps,
): Html<Msg> =>
  el(
    "span",
    [
      attr(
        "class",
        matchOption<Tone, SoftStr>(
          () => badgeClass,
          (tone: Tone) =>
            `${badgeClass} ${badgeToneClass(tone)}`,
        )(props.tone),
      ),
    ],
    [text(props.label)],
  );

/**
 * A TAG: a label of classification. One that can be
 * taken off carries a real button to do it.
 */
export type TagProps<Msg> = Readonly<{
  label: SoftStr;
  onRemove: Option<Msg>;
  removeLabel?: SoftStr;
}>;
export const tag = <Msg>(
  props: TagProps<Msg>,
): Html<Msg> =>
  el(
    "span",
    [attr("class", tagClass)],
    [
      text(props.label),
      ...matchOption<
        Msg,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (remove: Msg) => [
          el(
            "button",
            [
              attr("type", "button"),
              attr("class", tagRemoveClass),
              attr(
                "aria-label",
                props.removeLabel ??
                  `${props.label}のタグを外す`,
              ),
              onClick(remove),
            ],
            [text("×")],
          ),
        ],
      )(props.onRemove),
    ],
  );

/**
 * A CARD: one bounded group of content — a heading when
 * it has a name, its body, and a foot for what can be
 * done with it. An empty foot is not drawn.
 */
export type CardProps<Msg> = Readonly<{
  title: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
  foot: ReadonlyArray<Html<Msg>>;
}>;
export const card = <Msg>(
  props: CardProps<Msg>,
): Html<Msg> =>
  el(
    "section",
    [attr("class", cardClass)],
    [
      ...matchOption<
        SoftStr,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (title: SoftStr) => [
          el(
            "header",
            [attr("class", cardHeadClass)],
            [text(title)],
          ),
        ],
      )(props.title),
      el(
        "div",
        [attr("class", cardBodyClass)],
        props.body,
      ),
      ...(props.foot.length === 0
        ? []
        : [
            el(
              "footer",
              [attr("class", cardFootClass)],
              props.foot,
            ),
          ]),
    ],
  );

/**
 * A DATA TABLE: rows and columns under headings. A
 * column of numbers is set to the right so its digits
 * line up. The table scrolls sideways inside its own
 * frame; it never widens the column it stands in.
 */
export type TableColumn = Readonly<{
  label: SoftStr;
  numeric: boolean;
}>;
export type DataTableProps<Msg> = Readonly<{
  caption: SoftStr;
  columns: ReadonlyArray<TableColumn>;
  rows: ReadonlyArray<ReadonlyArray<Html<Msg>>>;
}>;
const cellAttrs = (
  columns: ReadonlyArray<TableColumn>,
  i: number,
): ReadonlyArray<ReturnType<typeof attr>> =>
  columns.some(
    (c: TableColumn, at: number) =>
      at === i && c.numeric,
  )
    ? [attr("class", numericClass)]
    : [];
export const dataTable = <Msg>(
  props: DataTableProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", tableWrapClass)],
    [
      el(
        "table",
        [
          attr("class", tableClass),
          attr("aria-label", props.caption),
        ],
        [
          el(
            "thead",
            [],
            [
              el(
                "tr",
                [],
                props.columns.map(
                  (c: TableColumn, i: number) =>
                    el(
                      "th",
                      [
                        attr("scope", "col"),
                        ...cellAttrs(
                          props.columns,
                          i,
                        ),
                      ],
                      [text(c.label)],
                    ),
                ),
              ),
            ],
          ),
          el(
            "tbody",
            [],
            props.rows.map(
              (cells: ReadonlyArray<Html<Msg>>) =>
                el(
                  "tr",
                  [],
                  cells.map(
                    (
                      cell: Html<Msg>,
                      i: number,
                    ) =>
                      el(
                        "td",
                        cellAttrs(
                          props.columns,
                          i,
                        ),
                        [cell],
                      ),
                  ),
                ),
            ),
          ),
        ],
      ),
    ],
  );

/**
 * A DESCRIPTION LIST: pairs of a term and its value —
 * the facts of one thing, read down.
 */
export type DescItem<Msg> = Readonly<{
  term: SoftStr;
  value: ReadonlyArray<Html<Msg>>;
}>;
export const descList = <Msg>(
  items: ReadonlyArray<DescItem<Msg>>,
): Html<Msg> =>
  el(
    "dl",
    [attr("class", descClass)],
    items.flatMap((item: DescItem<Msg>) => [
      el("dt", [], [text(item.term)]),
      el("dd", [], item.value),
    ]),
  );

/** A DIVIDER: a line between two groups. */
export const divider = <Msg>(): Html<Msg> =>
  el("hr", [attr("class", dividerClass)], []);

/**
 * AN AVATAR: the round mark of a person or a thing,
 * drawn from the first letter of its name. The whole
 * name is what a screen reader hears.
 */
export const avatar = <Msg>(
  name: SoftStr,
): Html<Msg> =>
  el(
    "span",
    [
      attr("class", avatarClass),
      attr("role", "img"),
      attr("aria-label", name),
    ],
    [text([...name.trim()].slice(0, 1).join(""))],
  );

/** A CODE BLOCK: source, shown as written. */
export const codeBlock = <Msg>(
  source: SoftStr,
): Html<Msg> =>
  el(
    "pre",
    [attr("class", codeBlockClass)],
    [el("code", [], [text(source)])],
  );

/**
 * AN EMPTY STATE: what stands where there is nothing yet
 * — what is missing, why, and the one thing to do next.
 */
export type EmptyStateProps<Msg> = Readonly<{
  title: SoftStr;
  hint: SoftStr;
  action: ReadonlyArray<Html<Msg>>;
}>;
export const emptyState = <Msg>(
  props: EmptyStateProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", emptyClass)],
    [
      el(
        "p",
        [attr("class", emptyTitleClass)],
        [text(props.title)],
      ),
      el("p", [], [text(props.hint)]),
      ...props.action,
    ],
  );

/**
 * AN ITEM LIST: rows of one shape — a title, a note
 * under it when there is one, and what trails at the
 * right (a badge, a count, a button).
 */
export type ListItem<Msg> = Readonly<{
  title: SoftStr;
  note: Option<SoftStr>;
  trailing: ReadonlyArray<Html<Msg>>;
}>;
export const itemList = <Msg>(
  items: ReadonlyArray<ListItem<Msg>>,
): Html<Msg> =>
  el(
    "ul",
    [attr("class", itemsClass)],
    items.map((item: ListItem<Msg>) =>
      el(
        "li",
        [attr("class", itemsRowClass)],
        [
          el(
            "div",
            [],
            [
              el(
                "div",
                [attr("class", itemsTitleClass)],
                [text(item.title)],
              ),
              ...matchOption<
                SoftStr,
                ReadonlyArray<Html<Msg>>
              >(
                () => [],
                (note: SoftStr) => [
                  el(
                    "div",
                    [
                      attr(
                        "class",
                        itemsNoteClass,
                      ),
                    ],
                    [text(note)],
                  ),
                ],
              )(item.note),
            ],
          ),
          el(
            "div",
            [attr("class", itemsTrailClass)],
            item.trailing,
          ),
        ],
      ),
    ),
  );
