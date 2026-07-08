---
type: Model
trip: plggmatic-extraction-cut
subject: Where to cut plggmatic — one plgg-family engine+theme package (stays) vs Pragmatic identity/DSL (ships to ../plggmatic)
author: Architect
status: approved-pending-consensus
reviewed_by:
  - Planner
  - Constructor
version: 2
supersedes: models/model-v1.md
---

# Model v2

**Author:** Architect
**Status:** approved-pending-consensus
**Reviewed-by:** Planner, Constructor

v2 adopts the converged team resolution. Two changes from v1: (1) **one**
`plgg-ui` package with a `plgg-ui/style` subpath, not two packages; (2) the `--pm`
design language resolved as a **parameterized `Theme`** whose default stays in
`plgg-ui`. The v1 analysis that was not contested — the two-surface import map,
the module classification, the dependency-direction + vendor-boundary check, the
192518 re-point, and the declined `plgg-view/style` fold — carries through
unchanged.

---

## Content

### 0. The cut, in one sentence

The plggmatic **engine + theme mechanism** (`Meta, Style, Layout, Component,
Form, Declare, Schedule, Render`) is generic plgg-family infrastructure and stays
in this monorepo as **one new package, `plgg-ui`**, consumed by BOTH plggpress and
the extracted plggmatic; what ships to `../plggmatic` is the **Pragmatic
design-system identity** — the `Theme` contract + `--pm-*` design-language *values*,
the concept/spec/DSL documents, and the showcase (`plggmatic-example`, `site`) —
built on top of the published `plgg-ui`.

The invariant every part of this is checked against
(`.workaholic/constraints/architecture.md`):

> **plggpress → plgg-family ONLY.** `plgg-ui` never imports `plggpress` or
> `plggmatic`. plggpress and plggmatic never import each other. plggmatic →
> plgg-family only.

---

### 1. The two consumed surfaces (unchanged from v1, confirmed)

Every plggpress→plggmatic production import, from `grep -rn 'from "plggmatic'`:

**Surface 1 — Theme / token / scheme / appearance** (`packages/plggpress/src/theme/*`):

| Consumer file | From `plggmatic` | From `plggmatic/style` |
| --- | --- | --- |
| `theme/baseCss.ts` | `themeToggleClass` | `colorVar, metricVar, maxWidth, minWidth` |
| `theme/appearanceScripts.ts` | `themeToggleClass` | `appearanceStorageKey, injectAppearanceScript` |
| `theme/shell.ts` | `themeToggleCss` | `schemeCss, metricCss, reducedMotionCss, syntaxCss` |
| `theme/navBar.ts` | `staticThemeToggle` | — |
| `theme/syntaxSeam.spec.ts` | — | `syntaxKinds` |

**Surface 2 — Declare → Schedule → Render → Form runtime** (`packages/plggpress/src/Admin/*`):

| Consumer file | Imported from `plggmatic` |
| --- | --- |
| `Admin/adminDeclaration.ts` | `Declaration, Path, SchedulerMsg, declare, menu, menuEntry, collection, action, confirm, loaded, async, query, makeRow, field` |
| `Admin/deliverAdmin.ts` | `ScheduledModel, SchedulerMsg, Scheduled, schedule, renderMode` |

**Key structural fact (re-verified for v2):** plggpress `theme/*` is a
**scheme-only consumer** — it imports zero runtime symbols; plggpress `Admin/*`
imports the runtime (which renders through Component/Layout transitively). The two
consumers prove the domain genuinely has two surfaces. v2 expresses that with two
subpaths, not two packages (§3).

---

### 2. Domain model — engine vs Pragmatic identity (unchanged from v1)

Reading `src/index.ts` + `src/styleEntry.ts`, and the internal layering
re-verified by import analysis (`Meta → Style → Layout/Component/Form →
Declare → Schedule → Render`, all emitting `plgg-view` `Html`, zero third-party
imports):

| Module | Classification |
| --- | --- |
| `Meta/model/identity.ts` (`frameworkName="plggmatic"`, `cssPrefix="pm"`) | **Split** — CSS-prefix/storage-key are neutral default infra (→ `plgg-ui`); the product *label* is identity |
| `Style/**` — token/scheme/palette/metric/breakpoint/typography/z/syntax **machinery** + CSS emitters + appearance wiring + contrast | Engine → `plgg-ui/style` |
| `Style` default **VALUES** — `defaultPalette` (monochrome, D9), `syntaxPalette`, metric/type/z defaults, `appearanceStorageKey="vp-appearance"` | **Default `Theme` values** — ship in `plgg-ui` as `defaultTheme`; plggmatic owns the *canonical* copy (§4) |
| `Layout/*`, `Component/*`, `Form/*`, `Render/*` | Engine → `plgg-ui` |
| `Declare/*`, `Schedule/*` | Engine (the proto-DSL) → `plgg-ui` |

**The "near-98%-engine" finding is confirmed and is the answer, not a problem.**
Essentially all current code is rebuildable generic engine → plgg-family. The
concept (`20260708-pragmatic-ai-native-ui-concept.md` §Positioning) governs: *"the
durable value is the AI-native design system and its DSL, not the generic engine,
which may well belong to the plgg family."* So the mechanical reading (engine →
plgg-family) and the product reading agree; Pragmatic keeps the design-system
contract + DSL, which is thin in code today and grows in `../plggmatic` (§5).

---

### 3. Component taxonomy — one package, two subpaths

**New plgg-family package: `plgg-ui`** (stays published in this monorepo).

- **Contents:** a verbatim `git mv` of `packages/plggmatic/src/{Meta,Style,Layout,
  Component,Form,Declare,Schedule,Render}/` + `styleEntry.ts` into
  `packages/plgg-ui/src/`, preserving history and every co-located `*.spec.ts`.
  Internal self-alias specifiers `plggmatic/<Tree>/…` → `plgg-ui/<Tree>/…`; tsconfig
  alias `plggmatic/* → src/*` → `plgg-ui/* → src/*`. Coverage holds by construction
  (specs move with code); gated ≥90 from day one via its own `plgg-test.config.json`
  (D14).
- **Deps:** `plgg`, `plgg-view` only. Never imports plggpress or plggmatic.
- **Two export surfaces = the two consumed surfaces:**
  - **Root barrel `plgg-ui`** — the **runtime** surface (Declare/Schedule/Render/
    Form/Layout/Component). Consumed by plggpress `Admin/*`.
  - **`plgg-ui/style` subpath** — the **complete theme** surface. It continues
    `export * from "plgg-view/style"` first, then the scheme-aware `--pm-*` atoms/
    emitters that **shadow** plgg-view's literal-hex atoms (exactly as
    `plggmatic/style` does today). Consumed by plggpress `theme/*`.

**Refinement carried from my round-1 review (accepted):** move the `themeToggle*`
exports (`themeToggleClass`, `staticThemeToggle`, `themeToggleCss`) **off the root
barrel and onto `plgg-ui/style`**, joining the scheme atoms already there. Then the
two subpaths *are* the two surfaces exactly: plggpress `theme/*` imports **only**
`plgg-ui/style`; plggpress `Admin/*` imports **only** `plgg-ui`. One check for the
Constructor at build time: confirm re-exporting `themeToggle` through `styleEntry`
introduces no module cycle — `Component/model/interaction` (its only intra-Component
dep) is a leaf that does not import `styleEntry`, so it should not.

**Why one package, not two (the boundary-integrity reason):** the theme surface is
not cleanly severable — `themeToggle` depends on `Component/model/interaction`, and
`Component ↔ Form` is a mutual cycle. A standalone `plgg-scheme` would have to
carve Component apart (surgery, not a move) and buy nothing this trip needs, since
the cross-repo consumer (plggmatic) imports both halves regardless. One package
with two subpaths keeps the two-surface truth while staying a low-risk verbatim
move.

**Future clean split line (recorded, not taken — sacrificial-architecture):** the
`plgg-ui/style` subpath is the exact fault line along which a standalone
`plgg-scheme` package should later be promoted **when a real theme-only external
consumer earns it** (modular-monolith-first: defer the second package until a
consumer needs the separation). The subpath makes that future split free because
the seam is already drawn.

**Base-token fold into `plgg-view/style`: DECLINED** (unchanged from v1, agreeing
with the Constructor). `plgg-view/style` exports its own `Color` type that
collides with the scheme `Color` (the reason `/style` shadows after the star);
folding a color-scheme opinion down into the neutral render layer re-opens that
collision and pollutes plgg-view's neutrality. Keep `plgg-view/style` untouched;
`plgg-ui/style` sits on top of it (re-export + extend).

---

### 4. `--pm` ownership — parameterized `Theme`, default stays in plgg-ui

This is the load-bearing resolution (my round-1 Concern 2, now converged). Three
layers, cleanly separated so the structure carries "plggmatic owns the `--pm`
design language" **without** breaking "plggpress must not import plggmatic":

1. **Mechanism → `plgg-ui/style` (all agree).** `colorVar → var(--${prefix}-…)`,
   the `schemeCss`/`metricCss`/`syntaxCss` emitters, the appearance wiring, contrast.
   Parameterized over a typed `Theme` (design-token input: prefix + `Palette` +
   metric/type/z values + storage key). Type-driven — the `Theme` is a rich domain
   type, never a widened primitive.
2. **Default → `plgg-ui` ships `defaultTheme`.** `plgg-ui` retains a shippable
   `defaultTheme` whose values remain `--pm` / `vp-appearance` / monochrome, so
   plggpress stays **byte-identical** (D16: the persisted `vp-appearance` key and
   `--pm-*` output must survive) **without** a plggmatic dependency. plggpress
   imports `defaultTheme` from `plgg-ui` and passes it explicitly.
3. **Ownership → plggmatic owns the `Theme` CONTRACT + brand + DSL, canonically /
   documentarily.** plggmatic names and specifies `--pm-*` as *the Pragmatic design
   language* in the concept/DSL, holds the canonical copy of the values, and may
   supply an extended or overriding `Theme` via the typed seam for its own
   consumers/showcase. It is **not** the exclusive home of the prefix/default.

**Softened framing (explicit correction of the "move values out" reading):** the
`--pm` values are **not removed** from `plgg-ui`. Ownership is split from home:
plggmatic owns the *canonical definition and the contract*; `plgg-ui` remains a
*self-sufficient default home* so every in-monorepo consumer needs zero plggmatic
dep. Any change that relocated the default *into* plggmatic would break plggpress's
dependency direction — see the D16 guard in §6.

---

### 5. Extract-now — small package is not an empty extraction

The extraction is worth doing now even though `plgg-ui` absorbs ~98% of the code.
The cluster that ships to `../plggmatic` carries the mass and the meaning:

- the **showcase** — `plggmatic-example` (workbench + Demo 1) and `site` (docs),
- the **concept + specs** — the AI-native concept record and the two model specs
  (screen-transition, input-field), the north-star docs that travel with the
  package,
- the **`Theme` contract + `--pm-*` design-language values** it owns (§4),
- and the **DSL**, which grows there.

A *small* `../plggmatic` package is acceptable because it is the *right* small
package — the design-system contract + identity + DSL, legitimately small in code
but large in value — not a hollow re-export. The DSL is thin today; the correct
move is to extract now and grow the DSL in `../plggmatic`, on its own release
cadence, decoupled from the engine's churn.

---

### 6. Translation fidelity, dependency direction, roadmap amendment

**Dependency direction** (verified against `architecture.md`):

- `plgg-ui` → `plgg`, `plgg-view`. ✔ upward-only; imports neither plggpress nor plggmatic.
- `plggpress` → `plgg-ui` (+ `plgg-ui/style`); drops `plggmatic` from `package.json`. ✔
- `plggmatic` → `plgg-ui` (+ `plgg`/`plgg-view`), re-exports/instantiates it under the brand. ✔
- Neither `plgg-ui` nor plggpress imports plggmatic. Invariant holds.

**Vendor boundary:** `plgg-ui` is a verbatim move of code that is already
"conformant — no third-party imports," so it is born **conformant, unexempted**
(add its audit row). plggpress stays **EXEMPT**, unchanged — the cut removes a dep,
adds no `node:` to its domain. Both are Review-trigger edits the ticket lists.

**192518 (dynamic sources): RE-POINT, not stranded** (unchanged). It adds a
Model-driven `Source` variant to `Declare/model/Source.ts` + `Schedule/usecase/
update.ts` — files this cut re-homes into `plgg-ui`. Land the cut (A1) first, then
re-point 192518 at `plgg-ui`; its Demo 1 motivation lives in `plggmatic-example`,
which moves to `../plggmatic`. Either order is safe; the cut is the higher-priority
structural decision.

**Roadmap amendment the cut requires** (record as a dated block / new D19 in
`20260704-plggpress-plggmatic-roadmap.md`; ticket B's split ADR references it):

- **D13 — REVERSED.** "plggmatic canonical home = this monorepo" no longer holds;
  the plggmatic *package* relocates to `../plggmatic`. The design system still
  *originates* here via plgg-family; the branded package leaves.
- **D1 — REFINED (softened, not reversed).** "Home of the declarative UI scheduler
  = plggmatic" becomes: the scheduler **engine** is homed in the new plgg-family
  package **`plgg-ui`**; plggmatic is the **branded design-system / DSL identity**
  that instantiates it. The roadmap's "plggmatic is both a framework and a design
  system" splits cleanly: **framework/engine → `plgg-ui`; design system → plggmatic.**
- **D16 — HONORED, with a guard.** The `--pm-*` cutover and `vp-appearance`
  preservation are kept *because* `plgg-ui` ships them as `defaultTheme` (§4). Guard:
  the `--pm` default lives in `plgg-ui`; plggmatic's ownership is canonical/
  documentary, so no future change may relocate the default into plggmatic (it would
  break plggpress's dependency direction).

---

## Review Notes

_(reviewers add notes here)_
