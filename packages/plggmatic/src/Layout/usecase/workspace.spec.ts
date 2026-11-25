import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { renderToString, text } from "plgg-view";
import { defaultTheme } from "plggmatic/Style";
import {
  workspaceCss,
  workspaceOptions,
} from "plggmatic/Style/usecase/workspaceCss";
import {
  stripMetrics,
  stripGeometry,
} from "plggmatic/Layout/model/geometry";
import {
  workspace,
  pinnedPanel,
  browser,
  menuColumn,
  widthColumn,
} from "plggmatic/Layout/usecase/workspace";
import {
  readPreference,
  savePreference,
} from "plggmatic/Layout/usecase/preference";

const g = stripGeometry(stripMetrics);
const render = (
  menuOpen: boolean,
  menuCompact: boolean,
  phone: boolean,
) =>
  renderToString(
    workspace(
      {
        geometry: g(1280, 0, "open"),
        menuOpen,
        menuCompact,
        phone,
      },
      [],
      [
        pinnedPanel([], [text("chat")]),
        browser(
          [],
          [
            menuColumn([], [text("menu")]),
            widthColumn("fit", [], [text("a")]),
            widthColumn("read", [], [text("b")]),
          ],
        ),
      ],
    ),
  );

test("the frame carries the geometry and its states; the strip ends in a seam", () => {
  const html = render(true, true, false);
  return all([
    check(
      html,
      toContain('class="pm-workspace"'),
    ),
    check(
      html,
      toContain("--pm-strip-panel:1060px"),
    ),
    check(html, toContain("data-pm-menu-open")),
    check(
      html,
      toContain("data-pm-menu-compact"),
    ),
    check(html, not(toContain("data-pm-phone"))),
    check(html, toContain("<aside")),
    check(
      html,
      toContain('data-pm-width="read"'),
    ),
    check(
      html.indexOf("pm-seam") >
        html.lastIndexOf("pm-col"),
      toBe(true),
    ),
  ]);
});

test("a closed menu and a phone are told to the stylesheet by attribute alone", () => {
  const html = render(false, false, true);
  return all([
    check(
      html,
      not(toContain("data-pm-menu-open")),
    ),
    check(html, toContain("data-pm-phone")),
  ]);
});

test("the stylesheet is escape-safe and names the rail, the widths and the phone snap", () => {
  const css = workspaceCss(defaultTheme)(
    workspaceOptions,
  );
  return all([
    check(/[<>&]/.test(css), toBe(false)),
    check(
      css,
      toContain(
        ".pm-workspace[data-pm-menu-compact]:not([data-pm-phone]) .pm-menu{width:64px;}",
      ),
    ),
    check(
      css,
      toContain(
        '.pm-browser .pm-col[data-pm-width="fit"]{width:var(--pm-strip-column,320px);}',
      ),
    ),
    check(
      css,
      toContain(
        "@media (max-width:639px){.pm-workspace{grid-template-columns:0 max-content;scroll-snap-type:x mandatory;}",
      ),
    ),
    check(
      css,
      toContain(
        ".pm-workspace[data-pm-programmatic-scroll]{scroll-snap-type:none;}",
      ),
    ),
  ]);
});

test("a preference is remembered as 1 or 0, and a store that throws reads as no", () => {
  const kept = new Map<string, string>();
  const store = () => ({
    getItem: (key: string) =>
      kept.get(key) ?? null,
    setItem: (key: string, value: string) => {
      kept.set(key, value);
    },
  });
  const broken = () => {
    throw new Error("blocked");
  };
  return all([
    check(
      readPreference("k", store),
      toBe(false),
    ),
    check(
      savePreference("k", true, store),
      toBe(true),
    ),
    check(kept.get("k"), toBe("1")),
    check(readPreference("k", store), toBe(true)),
    check(
      savePreference("k", false, store),
      toBe(true),
    ),
    check(
      readPreference("k", store),
      toBe(false),
    ),
    check(
      readPreference("k", broken),
      toBe(false),
    ),
    check(
      savePreference("k", true, broken),
      toBe(false),
    ),
  ]);
});
