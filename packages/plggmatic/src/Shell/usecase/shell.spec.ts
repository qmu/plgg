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
import { shellCss } from "plggmatic/Shell/usecase/shellCss";
import { controlsCss } from "plggmatic/Shell/usecase/controlsCss";
import { kitCss } from "plggmatic/Shell/usecase/kit";

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

test("the look is square, ruled in the text colour, and escape-safe", () => {
  const css =
    shellCss(defaultTheme) +
    controlsCss(defaultTheme);
  return all([
    check(/[<>&]/.test(css), toBe(false)),
    // no rounding anywhere but the explicit reset
    check(
      css
        .split("border-radius:")
        .slice(1)
        .every((rest) => rest.startsWith("0")),
      toBe(true),
    ),
    check(
      css,
      toContain(
        "border-right:1px solid var(--pm-text)",
      ),
    ),
    check(
      css,
      toContain(".pm-doc a[data-pm-opened]"),
    ),
  ]);
});

test("the kit puts the scheme first and the shared strip after the shell", () => {
  const css = kitCss(defaultTheme);
  return all([
    check(
      css.indexOf("--pm-text") <
        css.indexOf(".pm-shell{"),
      toBe(true),
    ),
    check(
      css.indexOf(".pm-shell{") <
        css.indexOf(".pm-share{"),
      toBe(true),
    ),
    check(/[<>&]/.test(css), toBe(false)),
  ]);
});
