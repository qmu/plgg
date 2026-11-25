import {
  type SoftStr,
  type Option,
  some,
  none,
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
  onClick,
} from "plgg-view";
import {
  type Application,
  type Url,
  type Cmd,
  cmdNone,
  cmdEffect,
  makeUrl,
} from "plgg-view/client";
import {
  type NavGroup,
  type ShellPage,
  shell,
  themeToggle,
  toast,
  readPreference,
  savePreference,
  openedAttr,
  columnAttr,
  toasterClass,
  kitAppearanceCss,
  monochrome,
  soft,
} from "plggmatic";
import {
  type Scheme,
  applyScheme,
  defaultTheme,
} from "plggmatic/style";
import {
  type Model,
  type Msg,
  type Shown,
  msg,
} from "./model.ts";
import {
  HOME,
  openOf,
  hrefOf,
} from "./address.ts";
import { type Page, pages } from "./pages.ts";

/**
 * The plggmatic CATALOG: the design system's pages and
 * live examples, shown in the framework's own standard
 * screen. One program, so that the thing being documented
 * and the thing doing the documenting cannot drift apart.
 *
 * Everything about the SCREEN is the framework's — the
 * shell, the shared strip, the sidebar, the look. What
 * this file owns is small: which pages exist, and how the
 * open ones are written into the address.
 */

export const FOLD_KEY =
  "plggmatic-catalog:folded";
/** The id of the `<style>` holding the appearance half. */
export const LOOK_SHEET = "catalog-look";

const pageOf = (id: SoftStr): Option<Page> =>
  fromNullable(pages.find((p) => p.id === id));

const known = (id: SoftStr): boolean =>
  pages.some((p) => p.id === id);

/**
 * The strip an address names, held to pages that exist: an
 * unknown first page is the home page, and the pages to its
 * right stop at the first unknown one.
 */
export const settle = (
  url: Url,
): Readonly<{
  head: SoftStr;
  rest: ReadonlyArray<SoftStr>;
}> => {
  const open = openOf(url);
  const firstBad = open.rest.findIndex(
    (id) => !known(id),
  );
  return {
    head: known(open.head) ? open.head : HOME,
    rest:
      firstBad < 0
        ? open.rest
        : open.rest.slice(0, firstBad),
  };
};

const narrow = (): boolean =>
  typeof window !== "undefined" &&
  window.innerWidth < 960;

export const init = (
  url: Url,
): readonly [Model, Cmd<Msg>] => [
  {
    path: url.path,
    ...settle(url),
    // a narrow window starts with the sidebar folded: the
    // page is what was asked for
    folded:
      typeof window !== "undefined" &&
      (narrow() || readPreference(FOLD_KEY)),
    scheme:
      typeof document !== "undefined" &&
      document.documentElement.classList.contains(
        "dark",
      )
        ? "dark"
        : "light",
    name: "",
    note: "",
    role: "fixed",
    agree: false,
    dialog: false,
    shown: [],
    presses: 0,
    saved: "",
    layout: "none",
    snap: "16",
    acyclic: true,
    maxOut: "",
    look: "monochrome",
  },
  cmdNone(),
];

const MESSAGE: Record<Shown["tone"], SoftStr> = {
  success: "保存しました",
  info: "新しい版があります",
  warning: "まだ保存していない変更があります",
  danger: "保存できませんでした",
};

const withToast = (
  model: Model,
  tone: Shown["tone"],
  message: SoftStr,
): Model => ({
  ...model,
  shown: [
    ...model.shown.slice(-2),
    {
      id: `${tone}-${model.shown.length}-${model.presses}-${message.length}`,
      tone,
      message,
    },
  ],
});

const flip = (s: Scheme): Scheme =>
  s === "light" ? "dark" : "light";

export const update = (
  m: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (m.kind) {
    case "UrlChanged":
      return [
        {
          ...model,
          path: m.url.path,
          ...settle(m.url),
        },
        cmdNone(),
      ];
    case "ToggleFold":
      return [
        { ...model, folded: !model.folded },
        cmdEffect(() => {
          savePreference(FOLD_KEY, !model.folded);
          return Promise.resolve(msg.done());
        }),
      ];
    case "ToggleScheme":
      return [
        { ...model, scheme: flip(model.scheme) },
        cmdEffect(() => {
          applyScheme(
            flip(model.scheme),
            document.documentElement,
            window.localStorage,
          );
          return Promise.resolve(msg.done());
        }),
      ];
    case "Done":
      return [model, cmdNone()];
    case "Press":
      return [
        { ...model, presses: model.presses + 1 },
        cmdNone(),
      ];
    case "SetName":
      return [
        { ...model, name: m.value },
        cmdNone(),
      ];
    case "SetNote":
      return [
        { ...model, note: m.value },
        cmdNone(),
      ];
    case "SetRole":
      return [
        { ...model, role: m.value },
        cmdNone(),
      ];
    case "ToggleAgree":
      return [
        { ...model, agree: !model.agree },
        cmdNone(),
      ];
    case "Save":
      return model.name === "" ||
        model.name.length > 24
        ? [
            withToast(
              model,
              "danger",
              "名前を 1〜24文字で入れてください",
            ),
            cmdNone(),
          ]
        : [
            withToast(
              {
                ...model,
                saved: `${model.name}（${model.role}）`,
              },
              "success",
              MESSAGE.success,
            ),
            cmdNone(),
          ];
    case "OpenDialog":
      return [
        { ...model, dialog: true },
        cmdNone(),
      ];
    case "CloseDialog":
      return [
        { ...model, dialog: false },
        cmdNone(),
      ];
    case "ConfirmDialog":
      return [
        withToast(
          { ...model, dialog: false },
          "info",
          "記録を消しました（見本なので何も消えていません）",
        ),
        cmdNone(),
      ];
    case "Toast":
      return [
        withToast(
          {
            ...model,
            presses: model.presses + 1,
          },
          m.tone,
          MESSAGE[m.tone],
        ),
        cmdNone(),
      ];
    case "SetLayout":
      return [
        { ...model, layout: m.value },
        cmdNone(),
      ];
    case "SetSnap":
      return [
        { ...model, snap: m.value },
        cmdNone(),
      ];
    case "ToggleAcyclic":
      return [
        { ...model, acyclic: !model.acyclic },
        cmdNone(),
      ];
    case "SetMaxOut":
      return [
        {
          ...model,
          maxOut: m.value.replace(/[^0-9]/g, ""),
        },
        cmdNone(),
      ];
    case "SetLook":
      return [
        { ...model, look: m.look },
        // only the appearance half is replaced: nothing
        // moves, everything is redressed
        cmdEffect(() => {
          const sheet =
            document.getElementById(LOOK_SHEET);
          if (sheet !== null)
            sheet.textContent = kitAppearanceCss(
              defaultTheme,
              m.look === "soft"
                ? soft
                : monochrome,
            );
          return Promise.resolve(msg.done());
        }),
      ];
    case "Dismiss":
      return [
        {
          ...model,
          shown: model.shown.filter(
            (s) => s.id !== m.id,
          ),
        },
        cmdNone(),
      ];
  }
};

/** The open pages' ids, left to right. */
const openIds = (
  model: Model,
): ReadonlyArray<SoftStr> => [
  model.head,
  ...model.rest,
];

const groups: ReadonlyArray<NavGroup> = pages
  .map((p) => p.group)
  .filter(
    (group, i, all) => all.indexOf(group) === i,
  )
  .map((group) => ({
    label: group,
    items: pages
      .filter((p) => p.group === group)
      .map((p) => ({
        label: p.title,
        href: some(p.id),
        children: [],
      })),
  }));

/**
 * A page drawn as the column at `index`. Its links open
 * their target as the column to its right — replacing
 * whatever stood there — and the one whose target IS that
 * column carries the framework's "opened" mark.
 */
const shellPage = (
  model: Model,
  page: Page,
  index: number,
): ShellPage<Msg> => {
  const ids = openIds(model);
  const next = fromNullable(ids[index + 1]);
  const link = (
    id: SoftStr,
    label: SoftStr,
  ): Html<Msg> =>
    a<Msg>(
      [
        href(
          hrefOf(model.path, model.head, [
            ...model.rest.slice(0, index),
            id,
          ]),
        ),
        ...matchOption<
          SoftStr,
          ReadonlyArray<ReturnType<typeof attr>>
        >(
          () => [],
          (open: SoftStr) =>
            open === id
              ? [attr(openedAttr, "")]
              : [],
        )(next),
      ],
      [text(label)],
    );
  return {
    route: page.id,
    title: page.title,
    // a strip is closed from its end: only the rightmost
    // page, and not when it is the only one
    close:
      index === 0 || index !== ids.length - 1
        ? none()
        : some(
            hrefOf(
              model.path,
              model.head,
              model.rest.slice(0, index - 1),
            ),
          ),
    wide: page.wide,
    body: page.body({ model, link }),
  };
};

export const view = (model: Model): Html<Msg> => {
  const ids = openIds(model);
  const last = ids[ids.length - 1];
  return el(
    "div",
    [],
    [
      shell<Msg>({
        brand: "plggmatic",
        home: hrefOf(model.path, HOME, []),
        atHome:
          model.head === HOME &&
          model.rest.length === 0,
        nav: {
          groups,
          resolve: (id: SoftStr) =>
            hrefOf(model.path, id, []),
          // the sidebar marks the page read last
          current: (id: SoftStr) => id === last,
          toggle: true,
          numbered: true,
          label: "目次",
        },
        folded: model.folded,
        fold: [onClick<Msg>(msg.toggleFold())],
        foot: [
          themeToggle<Msg>({
            scheme: model.scheme,
            toggle: msg.toggleScheme(),
          }),
        ],
        pages: ids.flatMap((id, index) =>
          matchOption<
            Page,
            ReadonlyArray<ShellPage<Msg>>
          >(
            () => [],
            (page: Page) => [
              shellPage(model, page, index),
            ],
          )(pageOf(id)),
        ),
      }),
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
    ],
  );
};

/**
 * After a paint that changed which pages are open: bring
 * the newest into view (again once its entrance animation
 * has given it a width), and tell the carousel the strip
 * changed.
 */
export const afterRender = (
  root: Element,
  previous: Option<Model>,
  current: Model,
): void => {
  const changed = matchOption<Model, boolean>(
    // a first paint of an address with pages to the right
    // must show the rightmost, like any other opening
    () => current.rest.length > 0,
    (before: Model) =>
      openIds(before).join() !==
      openIds(current).join(),
  )(previous);
  if (!changed) return;
  const cols = root.querySelectorAll(
    "[" + columnAttr + "]",
  );
  const last = cols[cols.length - 1];
  if (last === undefined) return;
  const calm = window.matchMedia(
    "(prefers-reduced-motion:reduce)",
  ).matches;
  const see = (): void =>
    last.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: calm ? "auto" : "smooth",
    });
  see();
  last.addEventListener("animationend", see, {
    once: true,
  });
  document.dispatchEvent(
    new Event("plgg:columns"),
  );
};

export const app: Application<Model, Msg> = {
  init,
  update,
  view,
  afterRender,
  onUrlChange: (url: Url): Msg => ({
    kind: "UrlChanged",
    url,
  }),
  // an address naming a page that does not exist is
  // rewritten to the strip it settled to
  toUrl: (model: Model): Url =>
    makeUrl(
      model.path,
      hrefOf("", model.head, model.rest),
    ),
};
