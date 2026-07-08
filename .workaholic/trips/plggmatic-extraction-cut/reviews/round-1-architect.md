---
type: Review
trip: plggmatic-extraction-cut
round: 1
reviewer: Architect
version: 1
reviews:
  - directions/direction-v1.md
  - designs/design-v1.md
---

# Review v1

- **Reviewer:** Architect
- **Round:** 1
- **Artifacts reviewed:** `directions/direction-v1.md` (Planner), `designs/design-v1.md` (Constructor)

This review is written from the structural-bridge / translation-fidelity lens:
does each artifact carry the concept's business intent into a structure whose
dependency direction and boundaries hold? I re-verified the coupling against the
code before ruling (`packages/plggmatic/src`), because my own v1 proposed **two**
packages and the Constructor proposes **one** — I owe that divergence an
evidence-based verdict, not a defense.

**Evidence I re-ran (decides the one-vs-two question):**

- `Style/` imports **nothing** from `Component/Layout/Render/Declare/Schedule/Form`
  — it is a genuinely clean lower layer. A scheme-only package is *layer-feasible*.
- **But** `Component/usecase/themeToggle.ts` imports `plggmatic/Component/model/
  interaction` **and** `plggmatic/styleEntry`. The theme-toggle plggpress consumes
  is a *themed Component*, not a Style atom.
- `Component ↔ Form` is a **real mutual cycle** (`Form/usecase/formView` →
  `Component/model/interaction`; `Component/usecase/{textInput,textArea,selectInput}`
  → `Form/usecase/controlParts`). Component and Form cannot be separated.

---

## Artifact 1 — `direction-v1.md` (Planner)

**Decision: Approve with observations.**

The framing is right and concept-faithful: the engine is *leverage* (stays), the
Pragmatic design-system contract + `--pm-*` language + DSL is the *differentiated
product* (ships). The "two products, different lifecycles" reading is the correct
business inversion of the ~98%-engine finding, and the published-contract cost
(§5) is the single most important business risk to name — I endorse it.

**Concern / trade-off (structural):** the direction's headline remedy — "cut the
engine's exported surface **deliberately narrow**" — is asserted but not located,
and it is partly in tension with its own premise. The cross-repo published
consumer is `../plggmatic`, and plggmatic needs *the whole engine* to instantiate
the design system. So the seam **to plggmatic cannot actually be narrow** — it is
approximately the entire barrel. Narrowness is real but lives on a different edge
than the direction implies.

**Concrete proposal (preserves fidelity):** relocate "narrow seam" from an
abstract virtue to two specific, curated export lists: (a) the root barrel = the
runtime surface (Declare/Schedule/Render/Form/Layout/Component), (b) the `/style`
subpath = the **complete** theme surface. Then observe the fact my re-check
surfaced: **plggpress `theme/*` is a scheme-only consumer** (it imports zero
runtime symbols — only `colorVar/schemeCss/metricCss/…` + `themeToggle*`). That is
where narrowness is genuinely achievable and business-relevant: plggpress's theme
seam can be kept to `/style` alone, never touching the runtime. Narrowness is
delivered by *curating exports and honoring the two-surface split*, not by
shrinking what plggmatic imports. Recommend the direction say so, so "narrow seam"
becomes an actionable acceptance criterion rather than a hope.

---

## Artifact 2 — `design-v1.md` (Constructor)

**Decision: Approve with minor suggestions.** (I concede one-package over my own
two-package v1 — see below — with two boundary refinements.)

**On one package vs. two — I change my position toward the Constructor's, on
evidence.** My v1 wanted `plgg-scheme` to carry "the whole theme surface" so
plggpress `theme/*` depends on one small package. The code says that surface is
**not cleanly severable**: the theme-toggle plggpress consumes depends on
`Component/model/interaction`, and Component is locked into a mutual cycle with
Form. A true scheme-only package would have to *carve* `Component/model/interaction`
+ `themeToggle` out of Component — surgery, not the Constructor's verbatim `git mv`
— and would buy nothing this trip needs, since plggmatic imports both halves
regardless. The Constructor's "one rebuildable sacrificial unit, moved verbatim,
specs and coverage intact" is the lower-risk, translation-faithful cut for the
mandate ("plggpress off plggmatic; plggmatic leaves"). **Approve `plgg-ui` as one
package.**

**Concern 1 / trade-off — the two-surface domain truth still deserves structural
expression.** Folding to one package is right, but the domain genuinely *has* two
surfaces (theme vs. runtime), and plggpress proves it by consuming them
separately. Losing that in one undifferentiated barrel would be a fidelity loss.
**Concrete proposal:** make the `plgg-ui/style` subpath carry the **complete**
theme seam — move the `themeToggle*` exports (`themeToggleClass`,
`staticThemeToggle`, `themeToggleCss`) **off the root barrel and onto `/style`**,
joining the scheme atoms/emitters already there. Result: plggpress `theme/*`
imports only `plgg-ui/style`; plggpress `Admin/*` imports only `plgg-ui`; the two
subpaths *are* the two surfaces. This keeps one package (low risk) while making the
future split line explicit and free — modular-monolith-first done correctly (defer
the second package until a real scheme-only *external* consumer earns it). One
check for the Constructor: confirm re-exporting `themeToggle` through `styleEntry`
introduces no module cycle (`interaction` is a leaf, so it should not).

**Concern 2 / trade-off — A3 as written contradicts the dependency invariant and
the design's own §2.** This is the load-bearing catch. §2 "Identity default" says
*plgg-ui keeps `cssPrefix="pm"`, `defaultPalette`, `vp-appearance` as shipped
defaults* (so plggpress stays byte-stable, D16). A3 then says *move the `pm` prefix
and monochrome `defaultPalette` **values** into the plggmatic package*. Those two
cannot both be literally true: **plggpress must not import plggmatic** (the trip's
hard invariant), so if the values' only home is plggmatic, plggpress either breaks
the invariant or loses its theme. **Concrete proposal (this is also my answer to
the `--pm` ownership question):** split "ownership" from "home."
- The theme **mechanism** (`colorVar → var(--${prefix}-…)`, `schemeCss`/`metricCss`
  emitters, appearance wiring) stays in `plgg-ui` — all three artifacts already
  agree.
- `plgg-ui` **retains a shippable default Theme** whose values remain
  `--pm`/`vp-appearance`/monochrome, because D16 requires plggpress to stay
  byte-stable **without** a plggmatic dep. The default effectively lives in
  plgg-ui.
- plggmatic "owns the `--pm-*` design language" in the **documentary/canonical**
  sense: it names and specifies `--pm` in the concept/DSL, and may supply an
  extended or overriding `Palette` for its own showcase via the parameterized
  `Theme` seam. It is **not** the exclusive home of the prefix/default.

So A3 is sound as *parameterization* (a typed `Theme` input — good, and
type-driven), but its prose "move the values **out** to plggmatic" is too strong
and must be softened to "plggmatic owns the canonical definition; plgg-ui ships
those same values as its default so no consumer needs a plggmatic dep." Otherwise
the structure fails to carry the intent without breaking the invariant.

**Endorse without change:** declining the base-token fold into `plgg-view/style`
(§2) — the `Color`-type collision and plgg-view neutrality make the fold a
regression; my v1 reached the same conclusion. And the 192518 re-point (land the
cut first, re-point `Source.ts`/`update.ts` at `plgg-ui`) is correct and not
stranded.

---

## Cross-artifact coherence

1. **Strong settled core — the values/mechanism split.** All three artifacts (my
   v1, Planner, Constructor) independently converge on the same line: the theme
   **mechanism** + the declare/schedule/render/form **engine** stay in plgg-family;
   the **`--pm-*` values, identity, DSL, showcase** are the Pragmatic product that
   ships. This is the decision the trip was called to make, and it is coherent
   across all three. Record it as the ADR's thesis.

2. **Resolved divergence — package count.** My v1 (two: `plgg-scheme` + `plgg-ui`)
   vs. Constructor (one: `plgg-ui`). Resolved to **one package** on the
   cycle/themeToggle evidence, with the `/style`-subpath refinement (Concern 1) as
   the compromise that keeps the two-surface truth. Planner is count-neutral
   (product layer); its "narrow seam" is satisfied by the curated root vs. `/style`
   export lists. No residual conflict.

3. **The one thing the team MUST nail before implementation — `--pm` home.** The
   A3-vs-§2 tension (Concern 2) is the only place a structure could break the
   invariant. Consensus needed: `plgg-ui` ships the `--pm`/`vp-appearance`/monochrome
   **default**; plggmatic owns the **canonical/documentary** design language and may
   override via the `Theme` seam. All three of us should point ticket B's split ADR
   at this resolution so a later reader does not "finish" moving `--pm` into
   plggmatic and silently break plggpress.

## Roadmap amendment the chosen cut requires (my task item 3)

The one-package cut, plus plggmatic's relocation, needs the roadmap
(`20260704-plggpress-plggmatic-roadmap.md`) amended on three decisions — record as
a dated amendment block (or a new D19) that ticket B's ADR references:

- **D13 — reversed.** "plggmatic canonical home = this monorepo" no longer holds;
  the plggmatic *package* relocates to `../plggmatic`. The design system still
  *originates* here via plgg-family, but the branded package leaves.
- **D1 — refined (softened), not reversed.** "Home of the declarative UI scheduler
  = plggmatic" becomes: the scheduler **engine** is homed in the new plgg-family
  package **`plgg-ui`**; plggmatic is the **branded design-system / DSL identity**
  that instantiates it. The roadmap's "plggmatic is both a framework and a design
  system" splits cleanly: **framework/engine → `plgg-ui`; design system → plggmatic.**
- **D16 — honored, with a guard note.** The `--pm-*` cutover and `vp-appearance`
  preservation are kept *because* `plgg-ui` ships them as its default (Concern 2).
  Add the guard: the `--pm` default lives in `plgg-ui`; plggmatic's "ownership" is
  canonical/documentary, so no future change should relocate the default into
  plggmatic (it would break plggpress's dependency direction).

## Review Notes

_(reviewers add notes here)_
