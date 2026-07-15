import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { baseCss } from "plggpress/theme/baseCss";

// After the D3/D16 cutover baseCss owns LAYOUT + PROSE only;
// color and geometry are plggmatic `--pm-*` tokens (its
// schemeCss/metricCss), so these pin (a) the token
// consumption and the clean cutover, and (b) the qmu
// layout/prose VALUES that stay bespoke here — so drift in
// either fails at build, not visually.
const css: string = baseCss;

test("D16 clean cutover: no legacy vp custom properties survive", () =>
  all([
    // neither definitions nor `var()` references of the old
    // per-theme custom properties survive. The needle is
    // split so this spec stays clean of the literal the
    // ticket-07 D16 grep hunts for.
    check(css, not(toContain("--" + "vp-"))),
    check(css, not(toContain(":root{"))),
    // the palette/geometry now come through plggmatic tokens
    check(css, toContain("var(--pm-text)")),
    check(css, toContain("var(--pm-surface)")),
    check(css, toContain("var(--pm-surface-2)")),
    check(css, toContain("var(--pm-border)")),
    check(css, toContain("var(--pm-muted)")),
    // the qmu inverted pill is primary-base on neutral surface
    check(
      css,
      toContain("background:var(--pm-primary-base)"),
    ),
    // shell geometry is metric tokens
    check(css, toContain("var(--pm-shell-max)")),
    check(css, toContain("var(--pm-sidebar)")),
    check(css, toContain("var(--pm-rail)")),
    check(css, toContain("var(--pm-measure)")),
  ]));

test("callouts ride the D9 role matrix, not hardcoded hexes", () =>
  all([
    // tip=success, warning, danger onto role surface/text/border
    check(
      css,
      toContain(
        "background:var(--pm-success-surface)",
      ),
    ),
    check(
      css,
      toContain("color:var(--pm-success-text)"),
    ),
    check(
      css,
      toContain(
        "border-color:var(--pm-warning-border)",
      ),
    ),
    check(
      css,
      toContain(
        "background:var(--pm-danger-surface)",
      ),
    ),
    // info/note stay neutral with a primary edge
    check(
      css,
      toContain(
        "border-color:var(--pm-primary-base)",
      ),
    ),
    // the retired emerald/amber/red ramp hexes are gone.
    // Needles are split ("#" + rest) so this spec stays
    // clean of the literals the ticket-07 AC3 grep hunts for.
    check(css, not(toContain("#" + "ecfdf5"))),
    check(css, not(toContain("#" + "10b981"))),
    check(css, not(toContain("#" + "f59e0b"))),
    check(css, not(toContain("#" + "ef4444"))),
    check(css, not(toContain("#" + "022c22"))),
    check(css, not(toContain("#" + "450a0a"))),
  ]));

test("scheme scroll motion is framework-owned; plggpress keeps its link-fade reset", () =>
  all([
    // the html/main scroll reset moved to plggmatic's
    // reducedMotionCss — not re-authored here
    check(css, not(toContain("scroll-behavior:auto"))),
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
    check(css, toContain("scroll-behavior:smooth")),
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
    check(css, toContain(".vp-doc a:focus-visible")),
    check(
      css,
      toContain(".vp-sidebar-link:focus-visible"),
    ),
    check(css, toContain(".vp-wordmark:focus-visible")),
  ]));

test("prose links carry qmu's weight and hit-area, cloning on wrap", () =>
  all([
    check(css, toContain("padding:0.15em 0.4em")),
    check(css, toContain("margin-inline:-0.4em")),
    check(css, toContain("box-decoration-break:clone")),
  ]));

test("headings: H1 2rem symmetry (tightened rhythm) and the sub-sm downscale from the token breakpoint", () =>
  all([
    check(css, toContain("margin:0 0 2rem")),
    // the sub-sm media boundary is composed from
    // plggmatic's maxWidth("sm") → (max-width:639px)
    check(css, toContain("@media (max-width:639px)")),
    check(css, toContain("font-size:1.75rem")),
    check(css, toContain("scroll-margin-top:3.75rem")),
  ]));

test("the lg app-shell boundary is the token breakpoint too", () =>
  all([
    check(css, toContain("@media (min-width:1024px)")),
    check(css, toContain("@media (max-width:1023px)")),
  ]));

test("inline code is the translucent overlay badge (surface-independent, not a token)", () =>
  all([
    check(css, toContain("rgba(0,0,0,0.08)")),
    check(css, toContain("rgba(0,0,0,0.15)")),
    check(css, toContain("rgba(255,255,255,0.13)")),
    check(css, toContain(".vp-doc code:hover")),
    // its ink IS a token (primary-base), matching the old brand
    check(
      css,
      toContain("color:var(--pm-primary-base)"),
    ),
  ]));

test("chrome text matches the oracle (wordmark 1rem, footer 13px)", () =>
  all([
    check(css, toContain("font-size:13px")),
    check(
      css,
      toContain("border-radius:6px;font-size:1rem"),
    ),
  ]));

test("the sans stack leads with Inter then qmu's system chain", () =>
  check(
    css,
    toContain('"Inter",ui-sans-serif,system-ui'),
  ));

test("no per-page 目次 panel styles remain (widget removed, 2026-07-03)", () =>
  all([
    check(css, not(toContain("vp-toc"))),
    check(css, not(toContain("interpolate-size"))),
  ]));

test("the sidebar tree is flush left - hierarchy by weight, never indentation", () =>
  all([
    check(css, not(toContain("margin-left:0.75rem"))),
    check(
      css,
      toContain(
        "padding:0.25rem 0.5rem;font-size:0.875rem",
      ),
    ),
  ]));

test("sidebar rows carry qmu's text-sm leading and 1px item gap", () =>
  all([
    check(
      css,
      toContain(
        "font-size:0.875rem;line-height:1.25rem",
      ),
    ),
    check(css, toContain("margin-top:1px")),
  ]));

test("a hovered link's inline-code badge flips to the hover ink (never ink-on-ink)", () =>
  all([
    check(css, toContain(".vp-doc a:hover code")),
    check(
      css,
      toContain(".vp-doc a:focus-visible code"),
    ),
  ]));

test("hover micro-interactions run at qmu's 150ms (no slower fades, no scale)", () =>
  all([
    check(
      css,
      not(toContain("background-color 0.2s,color 0.2s")),
    ),
    check(css, not(toContain("transform:scale(1.06)"))),
    check(css, toContain("background-color 0.15s")),
  ]));

test("chrome fades use qmu's sharp-in curve; only the fill fades", () =>
  all([
    check(css, toContain("cubic-bezier(0.4,0,0.2,1)")),
    // text color snaps (only the fill fades, never muddy)
    check(css, not(toContain(",color 0.15s"))),
  ]));
