---
created_at: 2026-06-30T10:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: a41a378
category: Changed
depends_on:
---

# plgg-press theme: light/dark switch, VitePress-faithful header + sidebar, and micro-interactions

# Overview

The first parity pass fixed layout/responsive but the chrome still reads as a generic skin, not VitePress: the header and sidebar are structurally different, there are no micro-interactions (hover/caret/toggle transitions), and there is no light/dark switch. Close the gap:

- Add a real LIGHT/DARK theme: a full dark palette (CSS custom properties redefined under `html.dark`), defaulting to `prefers-color-scheme`, with a header appearance-toggle button that flips + PERSISTS the choice. Persistence + no-FOUC require a tiny hand-written client script — a deliberate, scoped reversal of the strict zero-JS stance (the chrome's interactivity is worth one small inline script; it ships in production, injected at the render-to-string boundary so it survives escaping, like the dev live-reload).
- Rework the HEADER to VitePress's shape: brand left; a right-aligned group of nav links + a GitHub link + the appearance toggle + the mobile hamburger; hover transitions; ~64px with a bottom border.
- Rework the SIDEBAR to VitePress's shape: section titles with a collapse CARET that rotates on open (micro-interaction), nested indentation, an active item in the brand colour, and hover states.
- Add MICRO-INTERACTIONS via CSS transitions (links, buttons, caret rotation, the toggle) — smooth, GPU-cheap, zero extra JS beyond the toggle.

# Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — theme + stylesheet + the script-injection helper live under packages/plgg-press/src/theme
- `workaholic:implementation` / `policies/coding-standards.md` — typed view-functions, printWidth 50; the static CSS stays escape-safe; the client script is injected at the render-to-string boundary (it legitimately contains `<`/`>`/`&`), never through an escaped text node
- `workaholic:design` / `policies/emergent-design-system.md` — a coherent token system that themes via CSS custom properties (one palette indirection for light + dark)
- `workaholic:design` / `policies/self-explanatory-ui.md` — the appearance toggle + nav must be clear and keyboard-operable; nav stays usable without JS (only the dark toggle needs JS)

# Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/baseCss.ts` - add the dark palette under `html.dark`, the header/sidebar redesign, micro-interaction transitions, and the toggle styling
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/navBar.ts` - VitePress header structure incl. the GitHub link + the appearance-toggle button (`.vp-theme-toggle`)
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/themeScript.ts` - NEW: the no-FOUC `<head>` script + the toggle-wiring `<body>` script as strings, plus an `injectThemeScripts(html)` helper
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/router/pressRouter.ts` + `src/build.ts` - apply `injectThemeScripts` at the render-to-string boundary (content/home pages + the 404)
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/build.spec.ts` + `src/dev.spec.ts` - production now ships the (known) theme script; update the prior zero-`<script>` assertions to assert exactly the theme script (and dev additionally the live-reload)

# Implementation Steps

1. baseCss: route every colour through CSS custom properties; add `html.dark{ ... }` redefining the palette (dark bg, raised surfaces, lighter text, adjusted borders/code-bg). Default light; honour `prefers-color-scheme:dark` via the head script.
2. baseCss header: brand left, `.vp-nav-right` group pushed right (margin-left:auto) holding nav links + GitHub + `.vp-theme-toggle` + the `☰` label; hover colour transitions; 64px; bottom border.
3. baseCss sidebar: `summary` shows a caret (`::before` triangle) that rotates via `transition:transform .2s` on `[open]`; active link in brand colour; hover background; nested indent.
4. baseCss micro-interactions: `transition` on link/button colour+bg, the caret, and the toggle; subtle button hover lift on the home actions.
5. themeScript.ts: export the no-FOUC head script (read localStorage `vp-appearance` else `prefers-color-scheme`, add `dark` class on `document.documentElement` before paint) and the toggle script (wire `.vp-theme-toggle` click to flip the class + persist), plus `injectThemeScripts(html)` that string-inserts the head script before `</head>` and the toggle script before `</body>`. Keep the JS free of any `</script` sequence.
6. navBar: add the `.vp-theme-toggle` button (sun/moon glyphs swapped by CSS on `html.dark`) and a GitHub link in the right group.
7. Wire `injectThemeScripts` into pressRouter's handler and build()'s 404 render so every emitted/served page carries the toggle.
8. Update build.spec/dev.spec: production has exactly the theme script (assert it present, and that no OTHER/unexpected script leaks); dev additionally injects the live-reload EventSource script.
9. VERIFY VISUALLY in a headless browser: screenshot home + a content page + an API page at desktop AND mobile, in BOTH light and dark (force dark by presetting `class="dark"` on `<html>`), and iterate until the header/sidebar read VitePress-like, the toggle works, and dark mode is coherent.

# Considerations

- The client script is the one deliberate production-JS addition; keep it tiny, dependency-free, and inert-degrading (nav + content fully work without it; only the dark toggle needs it). The no-FOUC head script must run synchronously before first paint.
- plgg-highlight emits INLINE light-theme token colours, so code-block syntax colours do not re-theme in dark mode (only the code-block background does). Acceptable for v1; a dark syntax palette is a later enhancement — note it.
- The toggle script + head script contain `<`/`>`/`&`, so they MUST be injected at the render-to-string boundary (post-escape), never via a `text()` node — mirror the dev live-reload injection.
- Keep the mobile sidebar hamburger CSS-only (checkbox); only the dark toggle uses JS.

## Final Report

Development completed and verified in a headless browser (light + dark, desktop + mobile) AND deployed to the live container (plgg-guide.qmu.dev / :5181). Added a full light/dark palette (CSS vars under html.dark), a VitePress-faithful header (brand left; right group of nav links + a .vp-theme-toggle sun/moon button + the ☰ hamburger), sidebar collapse carets that rotate on open, micro-interaction transitions (links/buttons/caret/toggle/feature-cards), and a tiny dependency-free client script (no-FOUC head script + toggle wiring, persisted to localStorage) injected at the render-to-string boundary. Verified: tsc clean; 83 passed/0 failed; coverage 99.17/93.67/96.17/99.17; check-all.sh exit 0; live :5181 serves vp-theme-toggle + the theme script + html.dark.

### Discovered Insights

- **Insight**: The LIVE container caches the theme in its running dev-server process and only re-renders on fs.watch of the CONTENT dir — so plgg-press theme SOURCE changes do NOT appear until the container is RESTARTED. The container restart re-runs build.sh on the bind-mounted repo, which writes the SAME packages/*/dist as a host-side check-all, so the two must never run concurrently (shared-dist corruption). Always: finish host builds, THEN restart the container.
  **Context**: This caused a "nothing improved" gap — changes were verified in local static screenshots but not pushed live. Deploying a theme change = rebuild + restart the container (or, at ship, the Deploy Guide CI).
- **Insight**: A persistent dark-mode toggle genuinely requires client JS (localStorage + no-FOUC), so the strict zero-JS v1 stance was consciously reversed for the chrome. The script contains < > & so it is string-injected post-escape (like the dev live-reload), never via a text() node. plgg-highlight emits inline LIGHT-theme token colors, so code syntax colors do not re-theme in dark (only the code-block bg does) — a noted v1 limitation (dark syntax palette = later).
