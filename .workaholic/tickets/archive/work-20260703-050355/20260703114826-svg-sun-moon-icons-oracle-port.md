---
created_at: 2026-07-03T11:48:26+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 0.5h
commit_hash: 3ebf2f6
category: Changed
depends_on:
---

# Draw the theme-toggle sun/moon as real SVGs (port the oracle's icons; give plgg-view a minimal SVG vocabulary)

## Overview

The appearance toggle's sun is CSS-drawn (an 8px disc with two crossed bars) and reads as a "+" at rail size; the moon is a box-shadow crescent. qmu.co.jp's ThemeToggle draws both as single-path `currentColor` SVGs (24×24 viewBox, 18px box: an 8-ray sun and a crescent moon). The original port substituted CSS drawings because plgg-view had no SVG vocabulary — a recorded exception. Close it: give plgg-view a **minimal** SVG vocabulary (`svg` holding `path` children only, `svg` joins the Phrasing union so it stands in buttons/links), port the oracle's two `d` paths verbatim into plggpress's toggle, and delete the CSS drawings. Requested as sign-off feedback ("better sun svg pls, draw").

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — no escape hatches; the new builders follow element.ts's existing typed-content-model idiom exactly
- `workaholic:implementation` / `policies/emergent-design-system.md` — the icons are the oracle's own drawings, ported verbatim, not new artwork
- `workaholic:design` / `policies/self-explanatory-ui.md` — the toggle keeps its accessible name and the pre-paint light/dark glyph swap
- `workaholic:implementation` / `policies/directory-structure.md` — builders live in plgg-view's Html model beside their peers

## Key Files

- `packages/plgg-view/src/Html/model/element.ts` - add `svg` to the Phrasing union; add `svgEl` (children: `Html<Msg,"path">`) and a childless `path` builder; export both
- `packages/plgg-view/src/Html/model/element.spec.ts` - builder specs (svg renders viewBox/fill attrs and nested path d; path renders childless)
- `packages/plggpress/src/theme/navBar.ts` - the toggle renders the two oracle SVGs (classes `vp-sun`/`vp-moon` kept so the existing dark-mode display swap and specs hold)
- `packages/plggpress/src/theme/baseCss.ts` - delete the CSS-drawn sun/moon rules; size `.vp-sun`/`.vp-moon` at 18px; keep the display-swap rules
- `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/components/react/ThemeToggle.tsx` - READ-ONLY oracle for the two `d` strings

## Implementation Steps

1. plgg-view: `"svg"` into Phrasing; `svgEl`/`path` builders in element.ts's house style; specs; rebuild dist (plggmatic's facade star re-export exposes them without changes — probe).
2. plggpress navBar: replace the CSS spans with `svg([viewBox 0 0 24 24, fill currentColor, aria-hidden, class vp-sun|vp-moon], [path([d …])])` using the oracle's exact `d` strings.
3. baseCss: remove `.vp-sun::before/::after` etc.; `.vp-sun,.vp-moon{width:18px;height:18px;display:block}` + keep the swap (`html.dark` hides sun, shows moon); moon hidden by default.
4. Verify: plgg-view + plggpress suites green; fresh check-all; rebuild guide; screenshot the toggle in light and dark.

## Quality Gate

**Acceptance criteria:** the toggle renders the oracle's 8-ray sun (light) and crescent (dark) as inline SVGs with `fill="currentColor"`; the `d` attributes byte-match ThemeToggle.tsx; no CSS-drawn icon rules remain; `svg` composes inside `button` without escape hatches.

**Verification method:** element/navBar/baseCss specs; facade probe for `svg`/`path`; fresh `check-all.sh`; light+dark screenshots at the sign-off page.

**Gate:** suites + check-all green, screenshots show the oracle icons, developer approves.

## Considerations

- Keep the SVG vocabulary MINIMAL (svg + path only) — enough for the oracle's icon set (the GitHub octocat becomes possible as a follow-up), not a general vector layer
- `path` is not an HTML void tag: it renders `<path …></path>`, which is valid; do not add it to VOID_TAGS
- The oracle's rotate/opacity transition on the glyph swap is React-driven; plggpress keeps its CSS display swap (zero-JS design, recorded exception)

## Final Report

Development completed as planned. plgg-view gained the minimal SVG vocabulary — `svg` (holding `path` children only) joined the Phrasing union so an icon stands wherever text would, with a childless `path` builder in the house typed-content-model idiom. plggpress's theme toggle now renders the oracle's own icons, `d` strings ported verbatim from ThemeToggle.tsx (8-ray sun, crescent moon; currentColor, 18px box); the CSS-drawn disc-and-bars sun and box-shadow moon are deleted, with the zero-JS light/dark display swap retained. Screenshot-verified: the sun reads as a sun, the crescent sits correctly on the dark knob.

### Discovered Insights

- **Insight**: plggmatic's dist FREEZES its re-export surface at build time (plgg-bundle enumerates star exports when emitting), so a new export in a wrapped library is invisible to consumers until plggmatic itself rebuilds — "does not provide an export named 'path'" from the facade, while the source star re-export looks obviously correct.
  **Context**: After ANY wrapped-library surface change, rebuild the facade dist too; the stale-dist masking class extends to re-export enumeration, not just types.
