import { labels } from "./locale.ts";
import { type SoftStr } from "plgg";
import {
  type Html,
  attr,
  el,
  text,
} from "plgg-view";
import {
  confirmDialog,
  toast,
  toasterClass,
  cluster,
  cssVar,
  cssVarRef,
  exampleBox,
  preview,
  swatches,
} from "plggmatic";
import {
  type Model,
  type Msg,
  msg,
} from "./model.ts";

/**
 * What a page is drawn with: the catalog's state (so its
 * examples can be operated) and `link`, a link to another
 * page that opens it to the right of the page it is on.
 */
export type Ctx = Readonly<{
  model: Model;
  assetBase: string;
  hrefTo: (id: SoftStr) => SoftStr;
  link: (
    id: SoftStr,
    label: SoftStr,
  ) => Html<Msg>;
}>;

export type Node = Html<Msg>;

const t = (s: SoftStr): Node => text(s);

/** Mixed inline content: strings become text. */
export type Inline = ReadonlyArray<
  SoftStr | Node
>;
const inline = (
  parts: Inline,
): ReadonlyArray<Node> =>
  parts.map((part) =>
    typeof part === "string" ? t(part) : part,
  );

export const h1 = (s: SoftStr): Node =>
  el("h1", [], [t(s)]);
export const h2 = (s: SoftStr): Node =>
  el("h2", [], [t(s)]);
export const h3 = (s: SoftStr): Node =>
  el("h3", [], [t(s)]);
export const para = (...parts: Inline): Node =>
  el("p", [], inline(parts));
export const code = (s: SoftStr): Node =>
  el("code", [], [t(s)]);
export const list = (
  ...items: ReadonlyArray<Inline>
): Node =>
  el(
    "ul",
    [],
    items.map((item) =>
      el("li", [], inline(item)),
    ),
  );

/** A block of source, as written. */
export const source = (s: SoftStr): Node =>
  el("pre", [], [el("code", [], [t(s)])]);

/**
 * A live example: the real component, in the kit's
 * example box so it is seen against the page's surface
 * and nothing else.
 */
export const example = (
  ...children: ReadonlyArray<Node>
): Node => exampleBox<Msg>(children);

/** Examples side by side, wrapping. */
export const row = (
  ...children: ReadonlyArray<Node>
): Node => cluster<Msg>(children);

export const table = (
  heads: ReadonlyArray<SoftStr>,
  rows: ReadonlyArray<Inline>,
): Node =>
  el(
    "table",
    [],
    [
      el(
        "thead",
        [],
        [
          el(
            "tr",
            [],
            heads.map((h) =>
              el("th", [], [t(h)]),
            ),
          ),
        ],
      ),
      el(
        "tbody",
        [],
        rows.map((cells) =>
          el(
            "tr",
            [],
            cells.map((cell) =>
              el("td", [], inline([cell])),
            ),
          ),
        ),
      ),
    ],
  );

/** A whole screen shown inside the page, as a template shot. */
export const screen = (
  src: SoftStr,
  title: SoftStr,
  openLabel: SoftStr,
): Node =>
  preview<Msg>({
    title,
    src,
    openLabel,
  });

/** One colour token: its swatch, its name, its property. */
export const tokenSwatches = (
  names: ReadonlyArray<SoftStr>,
): Node =>
  swatches<Msg>(
    names.map((name: SoftStr) => ({
      name,
      written: cssVar(name),
      color: cssVarRef(name),
    })),
  );

export const feedback = (
  model: Model,
): ReadonlyArray<Node> => {
  const label = labels(model.locale);
  return [
    ...(model.dialog
      ? [
          confirmDialog<Msg>({
            title: label(
              "この記録を削除しますか？",
              "Delete this record?",
            ),
            body: label(
              "削除すると元に戻せません。",
              "You cannot undo this action.",
            ),
            confirmLabel: label("削除", "Delete"),
            cancelLabel: label(
              "キャンセル",
              "Cancel",
            ),
            destructive: true,
            onConfirm: msg.confirmDialog(),
            onCancel: msg.closeDialog(),
          }),
        ]
      : []),
    el(
      "div",
      [
        attr("class", toasterClass),
        attr("aria-live", "polite"),
      ],
      model.shown.map((s) =>
        toast<Msg>({
          id: s.id,
          tone: s.tone,
          message: s.message,
          onDismiss: msg.dismiss(s.id),
        }),
      ),
    ),
  ];
};
