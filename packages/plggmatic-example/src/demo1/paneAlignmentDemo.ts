import { type SoftStr } from "plgg";
import {
  type Html,
  slot,
  h2,
  p as para,
  span,
  button,
  text,
  attr,
  onClick,
} from "plgg-view";
import {
  type Sandbox,
  type Cmd,
  cmdNone,
} from "plgg-view/client";
import {
  type Parts,
  row,
  column,
  navPane,
  mainPane,
  asidePane,
} from "plggmatic";
import { basis, fluid } from "plggmatic/style";

/**
 * Demo 1 — a runnable proof of plggmatic's FIRST pillar,
 * the column-oriented pane alignment system, with the raw
 * layout combinators (`row`/`column`/`navPane`/`mainPane`/
 * `asidePane`) composed BY HAND — not through the
 * scheduler. The workbench (`/example/`) reaches the same
 * geometry only via `schedule` + `multiColumn`; this demo
 * shows the primitives directly so the alignment rules are
 * visible and interactive: collapse the nav or the aside
 * (panes are just omitted from the row), and cycle the nav
 * track between a fixed `basis(...)` and `fluid`.
 *
 * A plgg-view `sandbox` (no URL): one immutable `Model`,
 * every change a `Msg`, `update`/`view` pure.
 */

/** How the nav column sizes: two fixed widths, or fluid. */
export type NavWidth =
  "narrow" | "wide" | "fluid";

export type Msg =
  | Readonly<{ kind: "toggleNav" }>
  | Readonly<{ kind: "toggleAside" }>
  | Readonly<{ kind: "cycleNavWidth" }>;

export type Model = Readonly<{
  navOpen: boolean;
  asideOpen: boolean;
  navWidth: NavWidth;
}>;

export const init: readonly [Model, Cmd<Msg>] = [
  {
    navOpen: true,
    asideOpen: true,
    navWidth: "narrow",
  },
  cmdNone(),
];

const nextWidth = (w: NavWidth): NavWidth =>
  w === "narrow"
    ? "wide"
    : w === "wide"
      ? "fluid"
      : "narrow";

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "toggleNav":
      return [
        { ...model, navOpen: !model.navOpen },
        cmdNone(),
      ];
    case "toggleAside":
      return [
        { ...model, asideOpen: !model.asideOpen },
        cmdNone(),
      ];
    case "cycleNavWidth":
      return [
        {
          ...model,
          navWidth: nextWidth(model.navWidth),
        },
        cmdNone(),
      ];
  }
};

/** The alignment atom for the nav track's current mode. */
const navSizing = (w: NavWidth): Parts =>
  w === "narrow"
    ? [basis("180px")]
    : w === "wide"
      ? [basis("320px")]
      : [fluid];

const widthLabel = (w: NavWidth): SoftStr =>
  w === "narrow"
    ? "narrow (180px)"
    : w === "wide"
      ? "wide (320px)"
      : "fluid";

const ctrlBtn = (
  label: SoftStr,
  msg: Msg,
): Html<Msg, "button"> =>
  button(
    [attr("class", "pm-btn"), onClick(msg)],
    [text(label)],
  );

const paneLabel = (t: SoftStr): Html<Msg, "p"> =>
  para([attr("class", "pa-label")], [text(t)]);

/**
 * The nav column — a landmark `<nav>` pane whose track
 * sizing is the demo's live variable. Omitted from the row
 * entirely when collapsed (the alignment system needs no
 * "hidden" state — a pane you don't want is a pane you
 * don't compose).
 */
const navColumn = (model: Model): Html<Msg> =>
  column(navSizing(model.navWidth), [
    navPane(
      ["pa-nav"],
      [
        paneLabel("nav · navigation landmark"),
        para(
          [],
          [
            text(
              "A fixed-basis or fluid track. Cycle its width above.",
            ),
          ],
        ),
      ],
    ),
  ]);

const mainColumn: Html<Msg> = column(
  [fluid],
  [
    mainPane(
      [],
      [
        paneLabel(
          "main · main landmark · always fluid",
        ),
        para(
          [],
          [
            text(
              "The main track takes the row's remaining space. Collapse a side pane and this reflows to fill it.",
            ),
          ],
        ),
      ],
    ),
  ],
);

const asideColumn: Html<Msg> = column(
  [basis("240px")],
  [
    asidePane(
      ["pa-aside"],
      [
        paneLabel(
          "aside · complementary landmark",
        ),
        para(
          [],
          [
            text(
              "A fixed 240px track. Toggle it above.",
            ),
          ],
        ),
      ],
    ),
  ],
);

export const view = (model: Model): Html<Msg> =>
  slot(
    [attr("class", "pa-root")],
    [
      h2([], [text("Pane alignment")]),
      para(
        [attr("class", "pa-lead")],
        [
          text(
            "A row of columns; each column stacks landmark panes; sizing is a composed atom — ",
          ),
          span(
            [attr("class", "pa-code")],
            [text("basis(...)")],
          ),
          text(" for a fixed track, "),
          span(
            [attr("class", "pa-code")],
            [text("fluid")],
          ),
          text(
            " for the one that fills the rest.",
          ),
        ],
      ),
      slot(
        [attr("class", "pa-controls")],
        [
          ctrlBtn(
            model.navOpen
              ? "Collapse nav"
              : "Show nav",
            { kind: "toggleNav" },
          ),
          ctrlBtn(
            model.asideOpen
              ? "Collapse aside"
              : "Show aside",
            { kind: "toggleAside" },
          ),
          ctrlBtn(
            `Nav width: ${widthLabel(model.navWidth)}`,
            { kind: "cycleNavWidth" },
          ),
        ],
      ),
      row(
        ["pa-frame"],
        [
          ...(model.navOpen
            ? [navColumn(model)]
            : []),
          mainColumn,
          ...(model.asideOpen
            ? [asideColumn]
            : []),
        ],
      ),
    ],
  );

/** The wired sandbox program the demo entry mounts. */
export const program: Sandbox<Model, Msg> = {
  init,
  update,
  view,
};
