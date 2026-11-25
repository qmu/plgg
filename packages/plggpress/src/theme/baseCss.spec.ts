import {
  test,
  check,
  all,
  toContain,
  toBe,
  not,
} from "plgg-test";
import {
  sidebarNavClass,
  kitCss,
  docClass,
  shellClass,
  shellHeadClass,
  shellBrandClass,
} from "plggmatic";
import {
  colorVar,
  metricVar,
  colClass,
  selector,
} from "plggpress/themeSupport/styleEntry";
import { baseCss } from "plggpress/theme/baseCss";
import { defaultTheme } from "plggpress/themeSupport/styleEntry";

// After the D3/D16 cutover baseCss owns LAYOUT + PROSE only;
// color and geometry are plggmatic `--pm-*` tokens (its
// schemeCss/metricCss), so these pin (a) the token
// consumption and the clean cutover, and (b) the qmu
// layout/prose VALUES that stay bespoke here — so drift in
// either fails at build, not visually. baseCss is now a
// function of the resolved theme (D3, config-driven); the
// default theme is the monochrome qmu palette.
// `own` is plggpress's sheet alone; `css` is what a page
// ships — plggmatic's kit (the UI system and its default
// appearance) with plggpress's additions after it. The
// look is the kit's, so the look is asserted on `css`.
const own: string = baseCss(defaultTheme);
const css: string = kitCss(defaultTheme) + own;

// The framework's own token emitters, so these assertions
// name plggmatic's custom properties by IMPORT rather than
// by typing `--pm-…`: renaming the prefix upstream then
// fails here instead of silently emitting dead CSS.
const cvar = colorVar(defaultTheme);
const mvar = metricVar(defaultTheme);

test("D16 clean cutover: no legacy vp custom properties survive", () =>
  all([
    // neither definitions nor `var()` references of the old
    // per-theme custom properties survive. The needle is
    // split so this spec stays clean of the literal the
    // ticket-07 D16 grep hunts for.
    check(css, not(toContain("--" + "vp-"))),
    check(own, not(toContain(":root{"))),
    // the palette/geometry now come through plggmatic tokens
    check(css, toContain(cvar("text"))),
    check(css, toContain(cvar("surface"))),
    check(css, toContain(cvar("surface-2"))),
    check(css, toContain(cvar("border"))),
    check(css, toContain(cvar("muted"))),
    // the qmu inverted pill is primary-base on neutral surface
    check(
      css,
      toContain(
        "background:" + cvar("primary-base"),
      ),
    ),
    // column-strip geometry is metric tokens (the centred
    // shell-max is gone with the sidebar-first shell — the
    // strip scrolls horizontally instead of centring)
    check(css, toContain(mvar("sidebar"))),
    check(css, toContain(mvar("rail"))),
    check(css, toContain(mvar("measure"))),
  ]));

test("callouts ride the D9 role matrix, not hardcoded hexes", () =>
  all([
    // tip=success, warning, danger onto role surface/text/border
    check(
      own,
      toContain(
        "background:" + cvar("success-surface"),
      ),
    ),
    check(
      own,
      toContain("color:" + cvar("success-text")),
    ),
    check(
      own,
      toContain(
        "border-color:" + cvar("warning-border"),
      ),
    ),
    check(
      own,
      toContain(
        "background:" + cvar("danger-surface"),
      ),
    ),
    // info/note stay neutral with a primary edge
    check(
      own,
      toContain(
        "border-color:" + cvar("primary-base"),
      ),
    ),
    // the retired emerald/amber/red ramp hexes are gone.
    // Needles are split ("#" + rest) so this spec stays
    // clean of the literals the ticket-07 AC3 grep hunts for.
    check(own, not(toContain("#" + "ecfdf5"))),
    check(own, not(toContain("#" + "10b981"))),
    check(own, not(toContain("#" + "f59e0b"))),
    check(own, not(toContain("#" + "ef4444"))),
    check(own, not(toContain("#" + "022c22"))),
    check(own, not(toContain("#" + "450a0a"))),
  ]));

test("scheme scroll motion is framework-owned; plggpress keeps its link-fade reset", () =>
  all([
    // the html/main scroll reset moved to plggmatic's
    // reducedMotionCss — not re-authored here
    check(
      css,
      not(toContain("scroll-behavior:auto")),
    ),
    // but plggpress's own link-hover fade is still killed
    check(
      css,
      toContain(
        "@media (prefers-reduced-motion:reduce)",
      ),
    ),
    check(
      css,
      toContain(".vp-doc a{transition:none}"),
    ),
    // and the positive smooth-scroll stays
    check(
      css,
      toContain("scroll-behavior:smooth"),
    ),
  ]));

test("escape-safe: survives the SSR text escaper byte-for-byte", () =>
  all([
    check(css, not(toContain("<"))),
    check(css, not(toContain(">"))),
    check(css, not(toContain("&"))),
  ]));

test("syntax-highlight hues are framework-owned now (ticket 08) — none survive here", () =>
  all([
    // no tok-* rule remains in the bespoke sheet
    check(css, not(toContain("tok-"))),
    // and the GitHub syntax palette hexes are gone
    check(css, not(toContain("#" + "cf222e"))),
    check(css, not(toContain("#" + "ff7b72"))),
  ]));

test("hover inversions are keyboard-reachable (:focus-visible parity)", () =>
  all([
    check(
      css,
      toContain(
        "." + docClass + " a:focus-visible",
      ),
    ),
    check(
      css,
      toContain(
        "." +
          sidebarNavClass.link +
          ":focus-visible",
      ),
    ),
    check(
      css,
      toContain(
        "." + shellBrandClass + ":focus-visible",
      ),
    ),
  ]));

test("prose links keep a padded hit-area, cloning on wrap", () =>
  all([
    check(css, toContain("padding:.15em .3em")),
    check(css, toContain("margin-inline:-.3em")),
    check(
      css,
      toContain("box-decoration-break:clone"),
    ),
  ]));

test("headings: the title carries no rule of its own, and the sub-sm downscale comes from the token breakpoint", () =>
  all([
    check(
      css,
      toContain(
        "line-height:1.3;margin:0 0 1rem",
      ),
    ),
    // the sub-sm media boundary is composed from
    // plggmatic's maxWidth("sm") → (max-width:639px)
    check(
      css,
      toContain("@media (max-width:639px)"),
    ),
    check(css, toContain("font-size:1.25rem")),
    check(
      css,
      toContain("scroll-margin-top:1rem"),
    ),
  ]));

test("the lg app-shell boundary is the token breakpoint too", () =>
  all([
    check(
      css,
      toContain("@media (min-width:1024px)"),
    ),
    check(
      css,
      toContain("@media (max-width:1023px)"),
    ),
  ]));

test("inline code is a square wash of the token surface, no overlay alphas", () =>
  all([
    check(
      css,
      not(toContain("rgba(0,0,0,0.08)")),
    ),
    check(
      css,
      toContain(
        "background:" + cvar("surface-2"),
      ),
    ),
  ]));

test("nothing in the sheet is rounded", () =>
  all([
    check(own, not(toContain("border-radius"))),
    // the default appearance's radius is zero, everywhere;
    // the one round thing is the appearance toggle's own
    // button, which the kit carries unchanged
    check(
      css
        .split("border-radius:0")
        .join("")
        .split("border-radius:50%")
        .join(""),
      not(toContain("border-radius")),
    ),
  ]));

test("chrome text: the wordmark sits in a head bar, the footer is 13px", () =>
  all([
    check(css, toContain("font-size:13px")),
    check(
      css,
      toContain(
        "font-size:1rem;letter-spacing:-.01em",
      ),
    ),
  ]));

test("the sans stack leads with Inter and Noto Sans JP", () =>
  check(
    css,
    toContain('"Inter","Noto Sans JP",system-ui'),
  ));

test("no per-page 目次 panel styles remain (widget removed, 2026-07-03)", () =>
  all([
    check(css, not(toContain("vp-toc"))),
    // interpolate-size now belongs to the sidebar's toggle
    // groups alone (2026-11-25); the 目次 panel used it too.
    check(
      css.split("interpolate-size").length,
      toBe(2),
    ),
    check(
      css,
      toContain(
        "details." +
          sidebarNavClass.group +
          "{counter-reset:sample;interpolate-size:allow-keywords}",
      ),
    ),
  ]));

test("the sidebar tree is flush left - hierarchy by weight, never indentation", () =>
  all([
    check(
      css,
      not(toContain("margin-left:0.75rem")),
    ),
    check(
      css,
      toContain("padding:.5rem 1.25rem"),
    ),
  ]));

test("sidebar rows are full-width, ruled by a hairline, the current one inverted", () =>
  all([
    check(
      css,
      toContain(
        "font-size:.875rem;line-height:1.45",
      ),
    ),
    check(
      css,
      toContain(
        "border-bottom-color:" +
          cvar("primary-base"),
      ),
    ),
  ]));

test("a hovered link's inline-code badge flips to the hover ink (never ink-on-ink)", () =>
  all([
    check(
      css,
      toContain("." + docClass + " a:hover code"),
    ),
    check(
      css,
      toContain(
        "." + docClass + " a:focus-visible code",
      ),
    ),
  ]));

test("hover micro-interactions run at qmu's 150ms (no slower fades, no scale)", () =>
  all([
    check(
      css,
      not(
        toContain(
          "background-color 0.2s,color 0.2s",
        ),
      ),
    ),
    check(
      css,
      not(toContain("transform:scale(1.06)")),
    ),
    check(
      css,
      toContain("background-color 0.15s"),
    ),
  ]));

test("chrome fades use qmu's sharp-in curve; only the fill fades", () =>
  all([
    check(
      css,
      toContain("cubic-bezier(0.4,0,0.2,1)"),
    ),
    // text color snaps (only the fill fades, never muddy)
    check(css, not(toContain(",color 0.15s"))),
  ]));

test("the strip is one frame, one strip, one column shape", () =>
  all([
    // the frame is exactly the viewport
    check(
      css,
      toContain(
        "flex-direction:column;height:100dvh",
      ),
    ),
    // the strip scrolls sideways, nothing bounds it
    check(
      css,
      toContain(
        "overflow-x:auto;overflow-y:hidden",
      ),
    ),
    // one hairline per column, on the shared class, so a
    // column opened by a followed link is ruled too
    check(
      css,
      toContain(
        "border-right:1px solid " + cvar("text"),
      ),
    ),
    check(
      css,
      toContain(
        "." +
          shellClass +
          " " +
          selector(colClass) +
          "{",
      ),
    ),
    // a fixed head bar names the column; the body under
    // it is the only vertical scroller
    check(
      css,
      toContain("." + shellHeadClass + "{"),
    ),
    check(
      css,
      toContain(
        "flex:1 1 auto;min-height:0;overflow:auto",
      ),
    ),
    // no heading is pinned by hand any more
    check(
      css,
      not(toContain("position:sticky;top:-")),
    ),
    // a phone shows one page at a time
    check(
      css,
      toContain("scroll-snap-type:x mandatory"),
    ),
  ]));
