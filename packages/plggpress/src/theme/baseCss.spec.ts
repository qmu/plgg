import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { baseCss } from "plggpress/theme/baseCss";

// Pins the qmu.co.jp oracle VALUES (global.css), not just
// class names — so future drift from the corporate design
// guideline fails here instead of surfacing visually. Each
// assertion is one representative of a reconciled group
// (2026-07-03 re-diff).
const css: string = baseCss;

test("dark palette uses qmu's translucent inks (alpha is part of the spec)", () =>
  all([
    check(
      css,
      toContain(
        "--vp-text:rgba(240,240,245,0.92)",
      ),
    ),
    check(
      css,
      toContain(
        "--vp-text-2:rgba(235,235,245,0.55)",
      ),
    ),
    check(
      css,
      toContain(
        "--vp-brand:rgba(255,255,255,0.95)",
      ),
    ),
    // one single divider gray in dark
    check(css, toContain("--vp-border:#262629")),
    check(css, toContain("--vp-divider:#262629")),
  ]));

test("the appearance-toggle knob is WCAG 1.4.11-tuned in dark", () =>
  all([
    check(css, toContain("--vp-knob:#ffffff")),
    check(css, toContain("--vp-knob:#e4e4e7")),
  ]));

test("reduced motion is honored (no smooth scroll, no link fades)", () =>
  all([
    check(
      css,
      toContain(
        "@media (prefers-reduced-motion:reduce)",
      ),
    ),
    check(css, toContain("scroll-behavior:auto")),
  ]));

test("hover inversions are keyboard-reachable (:focus-visible parity)", () =>
  all([
    check(
      css,
      toContain(".vp-doc a:focus-visible"),
    ),
    check(
      css,
      toContain(".vp-sidebar-link:focus-visible"),
    ),
    check(
      css,
      toContain(".vp-wordmark:focus-visible"),
    ),
  ]));

test("prose links carry qmu's weight and hit-area, cloning on wrap", () =>
  all([
    check(css, toContain("padding:0.15em 0.4em")),
    check(css, toContain("margin-inline:-0.4em")),
    check(
      css,
      toContain("box-decoration-break:clone"),
    ),
  ]));

test("headings: H1 3rem symmetry and the sub-sm downscale", () =>
  all([
    check(css, toContain("margin:0 0 3rem")),
    check(
      css,
      toContain("@media (max-width:639px)"),
    ),
    check(css, toContain("font-size:1.75rem")),
    check(
      css,
      toContain("scroll-margin-top:3.75rem"),
    ),
  ]));

test("inline code is the translucent overlay badge with hover", () =>
  all([
    check(css, toContain("rgba(0,0,0,0.08)")),
    check(css, toContain("rgba(0,0,0,0.15)")),
    check(
      css,
      toContain("rgba(255,255,255,0.13)"),
    ),
    check(css, toContain(".vp-doc code:hover")),
  ]));

test("callouts wear qmu's tinted surfaces with dark pairs", () =>
  all([
    // tip: emerald 50 / 950 ramp
    check(css, toContain("background:#ecfdf5")),
    check(css, toContain("background:#022c22")),
    // warning: amber; danger: red
    check(css, toContain("border-color:#f59e0b")),
    check(css, toContain("border-color:#ef4444")),
  ]));

test("sidebar leaves rest at full ink on qmu's 4px pill with text-sm leading", () =>
  all([
    check(css, toContain("border-radius:4px;")),
    check(
      css,
      toContain(
        "font-size:0.875rem;line-height:1.25rem;\n  color:var(--vp-text)",
      ),
    ),
  ]));

test("chrome text matches the oracle (wordmark 1rem, footer 13px)", () =>
  all([
    check(css, toContain("font-size:13px")),
    check(
      css,
      toContain(
        "border-radius:6px;font-size:1rem",
      ),
    ),
  ]));

test("the sans stack leads with Inter then qmu's system chain", () =>
  check(
    css,
    toContain('"Inter",ui-sans-serif,system-ui'),
  ));

test("the 目次 panel and its disclosure animation are styled", () =>
  all([
    check(css, toContain(".vp-toc{")),
    check(
      css,
      toContain(
        "@supports (interpolate-size: allow-keywords)",
      ),
    ),
    check(
      css,
      toContain(".vp-toc a:focus-visible"),
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

test("no generic underline-on-hover exists to override the pill states", () =>
  all([
    check(
      css,
      not(
        toContain(
          "a:hover{text-decoration:underline}",
        ),
      ),
    ),
    check(
      css,
      toContain(".vp-mobilebar-home:hover"),
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
      toContain(
        "background-color 0.15s,color 0.15s",
      ),
    ),
  ]));

test("chrome fades use qmu's sharp-in curve; prose keeps its hand-written ease", () =>
  all([
    check(
      css,
      toContain("cubic-bezier(0.4,0,0.2,1)"),
    ),
    // prose links: the oracle's own rule is plain ease
    check(
      css,
      toContain(
        "transition:background-color 0.15s,color 0.15s;\n}\n.vp-doc a:hover",
      ),
    ),
  ]));
