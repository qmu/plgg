import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString, text } from "plgg-view";
import { defaultTheme } from "plggmatic/Style";
import {
  type ShellProps,
  shell,
} from "plggmatic/Shell/usecase/shell";
import {
  kitCss,
  kitSystemCss,
  kitAppearanceCss,
} from "plggmatic/Shell/usecase/kit";
import { systemCss } from "plggmatic/System/usecase/systemCss";
import {
  monochrome,
  soft,
} from "plggmatic/Appearance/model/appearance";
import { appearanceCss } from "plggmatic/Appearance/usecase/appearanceCss";

const props = (
  folded: boolean,
): ShellProps<never> => ({
  brand: "acme",
  home: "/",
  atHome: false,
  nav: {
    groups: [
      {
        label: "Guide",
        items: [
          {
            label: "Start",
            href: some("/start"),
            children: [],
          },
        ],
      },
    ],
    resolve: (href) => href,
    current: (href) => href === "/start",
    toggle: true,
    numbered: true,
    label: "Sections",
  },
  folded,
  fold: [],
  foot: [text("foot")],
  pages: [
    {
      route: "/start",
      title: "Start",
      close: none(),
      wide: false,
      body: [text("one")],
    },
    {
      route: "/shots",
      title: "Shots",
      close: some("/start"),
      wide: true,
      body: [text("two")],
    },
  ],
});

test("the standard screen is a sidebar and the open pages in one shared strip", () => {
  const html = renderToString(
    shell(props(false)),
  );
  return all([
    check(html, toContain('class="pm-shell"')),
    check(html, toContain("pm-share")),
    check(html, toContain("data-pm-strip")),
    check(html, toContain("pm-shell-side")),
    check(
      html,
      toContain('data-pm-column="/start"'),
    ),
    check(
      html,
      toContain('data-pm-column="/shots"'),
    ),
    // the sidebar comes before the pages
    check(
      html.indexOf("pm-shell-side") <
        html.indexOf("data-pm-column"),
      toBe(true),
    ),
    check(
      html,
      not(toContain("data-pm-shell-min")),
    ),
  ]);
});

test("only a page past the first can be closed; a wide page asks for two columns' worth", () => {
  const html = renderToString(
    shell(props(false)),
  );
  return all([
    check(
      html.split('class="pm-fold"').length,
      toBe(2),
    ),
    check(
      html,
      toContain('href="/start" class="pm-fold"'),
    ),
    check(
      html.split("pm-span-2").length,
      toBe(2),
    ),
  ]);
});

test("a folded sidebar is told to the stylesheet by one attribute, and to assistive tech", () => {
  const html = renderToString(shell(props(true)));
  return all([
    check(html, toContain("data-pm-shell-min")),
    check(
      html,
      toContain('aria-expanded="false"'),
    ),
  ]);
});

test("the system sheet makes no visual decision: no colour, font, border, radius, padding or duration", () => {
  const css = systemCss(defaultTheme);
  return all([
    check(/[<>&]/.test(css), toBe(false)),
    check(
      [
        "color:",
        "background",
        "font-family",
        "font-size",
        "border:",
        "border-radius",
        "padding",
        "transition",
        "box-shadow",
        "animation:",
      ]
        // as a declaration of its own, not inside
        // another property's name (scroll-padding-left)
        .filter((decision) =>
          new RegExp("[{;]" + decision).test(css),
        )
        .join(),
      toBe(""),
    ),
    // it does fix the structure
    check(
      css,
      toContain(
        ".pm-shell .pm-col{flex:none;display:flex;flex-direction:column;min-height:0;overflow:hidden}",
      ),
    ),
  ]);
});

test("an appearance sheet positions nothing: it dresses what the system laid out", () => {
  const css =
    appearanceCss(defaultTheme)(monochrome);
  return all([
    check(/[<>&]/.test(css), toBe(false)),
    check(
      [
        "position:fixed",
        "position:sticky",
        "flex:1",
        "overflow-x",
      ]
        .filter((layout) => css.includes(layout))
        .join(),
      toBe(""),
    ),
  ]);
});

test("monochrome is one ink, square and inverted; soft answers every one of those differently", () => {
  const mono =
    appearanceCss(defaultTheme)(monochrome);
  const other = appearanceCss(defaultTheme)(soft);
  return all([
    check(
      mono,
      toContain(
        ".pm-shell .pm-col{background:var(--pm-surface);border-right:1px solid var(--pm-text)}",
      ),
    ),
    check(
      mono
        .split("border-radius:")
        .slice(1)
        .every((rest) => rest.startsWith("0")),
      toBe(true),
    ),
    check(
      mono,
      toContain(
        ".pm-doc a[data-pm-opened]{background:var(--pm-primary-base);color:var(--pm-surface)",
      ),
    ),
    check(
      other,
      toContain(
        "border-right:1px solid var(--pm-border)}",
      ),
    ),
    check(
      other,
      toContain("border-radius:.5rem"),
    ),
    check(
      other,
      toContain(
        ".pm-doc a[data-pm-opened]{background:var(--pm-primary-surface);color:var(--pm-primary-text)",
      ),
    ),
  ]);
});

test("the kit is the system half then the appearance half, and the appearance half alone can be replaced", () => {
  const css = kitCss(defaultTheme);
  return all([
    check(
      css,
      toBe(
        kitSystemCss(defaultTheme) +
          kitAppearanceCss(
            defaultTheme,
            monochrome,
          ),
      ),
    ),
    check(
      kitSystemCss(defaultTheme),
      toBe(kitSystemCss(defaultTheme)),
    ),
    check(
      kitAppearanceCss(defaultTheme, soft) ===
        kitAppearanceCss(
          defaultTheme,
          monochrome,
        ),
      toBe(false),
    ),
    check(/[<>&]/.test(css), toBe(false)),
  ]);
});
