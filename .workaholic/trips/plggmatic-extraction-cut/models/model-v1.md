---
type: Model
trip: plggmatic-extraction-cut
subject: Where to cut plggmatic — reusable plgg-family engine/theme (stays) vs Pragmatic identity (ships to ../plggmatic)
author: Architect
status: draft
reviewed_by:
version: 1
---

# Model v1

**Author:** Architect
**Status:** draft
**Reviewed-by:**

---

## Content

### 0. The question, restated structurally

`plggpress` depends on `plggmatic` through **two disjoint import surfaces**. The
extraction (ticket `…195655`) re-homes both into **new plgg-family packages that
stay in this monorepo**, so `plggpress` (stays) and `plggmatic` (leaves to
`../plggmatic`) both depend *upward* on plgg-family, and neither depends on the
other. The load-bearing decision is **where the line falls** between (a) the
rebuildable engine/theme that becomes plgg-family and (b) the *Pragmatic*
identity that ships out.

The single invariant every candidate cut is checked against
(`.workaholic/constraints/architecture.md`, dependency-direction + vendor
boundary):

> **plggpress → plgg-family ONLY.** The new packages must never import
> `plggpress` or `plggmatic`. plggmatic → plgg-family only. plggpress and
> plggmatic never import each other.

---

### 1. The two consumed surfaces, mapped concretely

Every plggpress→plggmatic import (production), from
`grep -rn 'from "plggmatic'` under `packages/plggpress/src`:

**Surface 1 — Theme / token / scheme / appearance** (consumed by
`packages/plggpress/src/theme/*`):

| Consumer file | From `plggmatic` | From `plggmatic/style` |
| --- | --- | --- |
| `theme/baseCss.ts:2,8` | `themeToggleClass` | `colorVar, metricVar, maxWidth, minWidth` |
| `theme/appearanceScripts.ts:2,6` | `themeToggleClass` | `appearanceStorageKey, injectAppearanceScript` |
| `theme/shell.ts:21,27` | `themeToggleCss` | `schemeCss, metricCss, reducedMotionCss, syntaxCss` |
| `theme/navBar.ts:15` | `staticThemeToggle` | — |
| `theme/syntaxSeam.spec.ts:12` | — | `syntaxKinds` |

All of these resolve into `plggmatic/src/Style/**` (+ the `themeToggle*` atoms in
`Component/usecase/themeToggle.ts`). `plggmatic/style` (`src/styleEntry.ts`)
already `export * from "plgg-view/style"` first and then **shadows** plgg-view's
literal-hex color atoms with the scheme-aware `var(--pm-*)` versions. So Surface 1
is entirely the **Style tree + the theme-toggle component**.

**Surface 2 — Declare → Schedule → Render → Form runtime** (consumed by
`packages/plggpress/src/Admin/*`):

| Consumer file | Imported from `plggmatic` |
| --- | --- |
| `Admin/adminDeclaration.ts:14–28` | `Declaration, Path, SchedulerMsg, declare, menu, menuEntry, collection, action, confirm, loaded, async, query, makeRow, field` |
| `Admin/deliverAdmin.ts:41–48` | `ScheduledModel, SchedulerMsg, Scheduled, schedule, renderMode` |

Admin imports the **declarative vocabulary** (`Declare/*`) + the **TEA scheduler**
(`Schedule/*`) + `renderMode` (`Render/*`). It never names `Layout`, `Component`,
or `Form` directly — but `schedule`/`renderMode` render *through* them, so the
runtime cut cannot stop at Declare/Schedule; it pulls `Render → Component/Layout`
and `Form` transitively (see §3, the "Render depends on Component/Layout"
Consideration in the ticket).

Both consumers also depend on already-shared plgg-family (`plgg`,
`plgg-view`, `plgg-view/client`, `plgg-content`, `plgg-auth`,
`plggpress/framework`) — none of that moves.

---

### 2. Domain model — generic engine vs Pragmatic identity

Reading `src/index.ts` + `src/styleEntry.ts`, the whole plggmatic surface
partitions as follows. "Rebuildable engine" = a machine-checkable unit an AI
could regenerate from its types (sacrificial-shell sense). "Identity" = the
durable *Pragmatic* value the concept names.

| Module | Contents | Classification |
| --- | --- | --- |
| `Meta/model/identity.ts` | `frameworkName = "plggmatic"`, `cssPrefix = "pm"` | **Split** — the product *label* is identity; the CSS-prefix + storage-key are neutral infrastructure (see §3.2) |
| `Style/model/{token,scheme,hexColor,palette,metric,breakpoint,typography,zIndex,syntax}` | token *machinery* (`Color`, `colorVar → var(--pm-*)`, `Scheme` union, `Palette` type, metric/type/z/syntax vocab) **+ default VALUES** (`defaultPalette` monochrome D9, `syntaxPalette`) | **Machinery = engine; VALUES = design-language identity** |
| `Style/usecase/{schemeCss,metricCss,syntaxCss,chromeCss,reducedMotion,appearanceScript,contrast,utilities}` | CSS emitters + contrast checker + appearance-toggle wiring | Engine |
| `Layout/*` | `row/column/pane/navPane/mainPane/asidePane` combinators | Engine |
| `Component/*` | `button, textLink, heading, prose, navTree, breadcrumb, colHead, textInput, textArea, selectInput, checkbox, confirmDialog, toast, themeToggle` | Engine |
| `Form/*` | `FieldSpec, parseForm, errorFor, formView, ControlKind, SubmissionState` | Engine |
| `Render/*` | `Mode, Screen, multiColumn, singleColumn, renderMode` | Engine |
| `Declare/*` | `field, makeRow, Source, Query, Action, Collection, Menu, Declaration` | Engine (proto-DSL — see §2.1) |
| `Schedule/*` | `Model, Msg, Scene, schedule, update, codec, scene, chain` | Engine |

**The "near-98%-engine" finding is confirmed at the code level.** Essentially all
*current* plggmatic source is rebuildable generic engine. The only code that is
irreducibly *Pragmatic* is thin: the product label (`frameworkName`), and the
**design-language VALUES** — `defaultPalette` (the black/white monochrome scheme,
D9), `syntaxPalette`, and the specific metric/type/z defaults. The `--pm-` prefix
is a *convention*, not logic.

#### 2.1 …but the concept relocates the durable value away from that 98%

The concept spec (`20260708-pragmatic-ai-native-ui-concept.md` §Positioning) is
explicit and must govern the cut:

> "Pragmatic's durable value is the **AI-native design system and its DSL**, not
> the generic engine, which may well belong to the plgg family."

So the code-mechanical reading (98% engine → plgg-family) and the concept reading
**agree on direction**: the engine belongs to plgg-family; Pragmatic keeps the
*design-system-as-DSL*. The catch is that the DSL is *aspirational* — today it
exists only as (a) the `declare → schedule → render` vocabulary (a **proto-DSL**,
`Declare/*`), which is engine and moves out, and (b) the concept + the two model
specs (`…screen-transition-model.md`, `…input-field-model.md`), which are
`.workaholic/` documents, not package code. **The Pragmatic identity is therefore
mostly not-yet-built.** This is the crux the trip must resolve (§5, risk).

---

### 3. Component taxonomy — the proposed cut

Two new plgg-family packages, aligned to the two surfaces and to the roadmap's own
token-vs-scheduler split (phases 1 vs 4):

#### 3.1 `plgg-scheme` (new plgg-family) — Surface 1

- **Contents:** the entire `Style/` tree (token/scheme/palette/metric/breakpoint/
  typography/zIndex/syntax machinery + the CSS emitters + appearance wiring +
  contrast) **and** the `themeToggle` component from `Component/usecase/themeToggle.ts`.
- **Public surface:** a root `src/index.ts` re-exporting exactly the symbols
  Surface 1 needs — `colorVar, metricVar, maxWidth, minWidth, appearanceStorageKey,
  injectAppearanceScript, schemeCss, metricCss, reducedMotionCss, syntaxCss,
  syntaxKinds, themeToggleClass, staticThemeToggle, themeToggleCss` — plus the
  types (`Scheme, Color, Metric, SyntaxKind, Palette`). It replaces the
  `plggmatic/style` subpath for plggpress.
- **Deps:** `plgg`, `plgg-view` (it keeps the `export * from "plgg-view/style"` +
  scheme-aware shadow relationship). No plggpress, no plggmatic.
- **Ships the default design tokens** (the monochrome `defaultPalette`, the `--pm`
  prefix, the `vp-appearance` storage key) as the plgg-family **default theme**
  (see §3.2 for why these live here, not in plggmatic).

#### 3.2 `plgg-ui` (new plgg-family) — Surface 2

- **Contents:** `Declare/`, `Schedule/`, `Render/`, `Form/`, `Layout/`, and the
  remaining `Component/*` (everything except `themeToggle`, which went to
  `plgg-scheme`). This is the whole Declare→Schedule→Render→Form engine plus the
  Layout/Component it renders through.
- **Public surface:** the runtime half of today's `plggmatic` root barrel —
  `Declaration, Path, SchedulerMsg, declare, menu, menuEntry, collection, action,
  confirm, loaded, async, query, makeRow, field, schedule, renderMode, Scheduled,
  ScheduledModel`, etc. Replaces `plggmatic` for plggpress `Admin/*`.
- **Deps:** `plgg`, `plgg-view` (+ `plgg-view/client` for `Cmd`), and
  `plgg-scheme` (Components style through the scheme atoms). No plggpress, no
  plggmatic.

#### 3.3 What stays plggmatic-branded (ships to `../plggmatic`, ticket B)

- `Meta/model/identity.ts`'s **product label** `frameworkName = "plggmatic"` (for
  data-attributes/docs), *if* it is still referenced after the split.
- A thin **branded facade barrel** (`plggmatic` + `plggmatic/style`) that
  re-exports `plgg-scheme` + `plgg-ui` under the Pragmatic name, so *external*
  consumers of `../plggmatic` keep one import surface. This is the "keep plggmatic
  green by re-exporting the moved code" step (ticket implementation step 3/5).
- The **concept + specs** (`20260708-pragmatic-*` in `.workaholic/specs`) and the
  **DSL work** (the not-yet-built terminal form) — the actual durable identity.
- The `plggmatic-example` **showcase** (separate package, already leaf-app EXEMPT).

**The `--pm` / cssPrefix / `vp-appearance` decision (boundary integrity).** These
three are, per the concept, *Pragmatic's `--pm-* design language*. But plggpress
consumes exactly them (`baseCss` emits `var(--pm-*)`; D16 preserves `vp-appearance`
so visitors' theme survives) and must stop depending on plggmatic. They therefore
**cannot** ship out with plggmatic without breaking plggpress. v1 recommends:
treat the prefix + storage-key + monochrome default as **neutral plgg-scheme
infrastructure/default theme** (sacrificial-architecture: the *values* are
replaceable shell, the token *machinery* is the durable core), and reduce
plggmatic's `Meta` identity to the product label only. The stricter alternative —
**parameterize the prefix** so `plgg-scheme` is brand-neutral and plggpress
supplies `"pm"` — is cleaner in principle but a larger change (the CSS is emitted
statically today) and is called out for the Planner/Constructor to weigh, not
decided here.

---

### 4. Translation fidelity & boundary integrity

**Does the cut carry the business intent faithfully?** The concept's intent is
"the engine may belong to plgg-family; Pragmatic keeps the AI-native design
system + DSL." The proposed cut realizes exactly that: 98% of the code
(engine + theme machinery) becomes plgg-family (`plgg-scheme` + `plgg-ui`);
plggmatic retains the identity layer (label, branded facade, concept/specs, DSL,
showcase). **Fidelity is high on intent** — the risk is that the retained layer is
thin *today* (§5).

**Dependency direction** — verified against `architecture.md`:

- `plgg-scheme` → `plgg`, `plgg-view`. ✔ upward-only.
- `plgg-ui` → `plgg`, `plgg-view`, `plgg-scheme`. ✔ upward-only.
- `plggpress` → `plgg-scheme`, `plgg-ui` (drops `plggmatic` from `package.json`). ✔
- `plggmatic` → `plgg-scheme`, `plgg-ui`. ✔ Neither new package imports plggpress
  or plggmatic; plggpress and plggmatic no longer import each other. ✔ Invariant holds.

**Vendor boundary** (`architecture.md` audit table): `plgg-scheme` and `plgg-ui`
are pure domain vocabulary (plggmatic is already "conformant — no third-party
imports"), so both are born **conformant, unexempted** — they inherit plggmatic's
clean status. plggpress stays EXEMPT (unchanged; the cut removes a dep, doesn't add
`node:` to its domain). The audit table gains two rows; the dependency-direction
"Bounds" sentence must name the two new packages. **Both are Review-trigger edits
the ticket already lists.**

**Roadmap reconciliation (D1–D16):**

- **D1** (scheduler home = plggmatic): *softened* by this cut — the scheduler
  *engine* moves to `plgg-ui`; plggmatic remains its *branded home / DSL owner*.
  Consistent with the concept, which post-dates D1. Flag for Planner.
- **D3/D16** (theme-first, `--pm-*` cutover, keep `vp-appearance`): honored —
  `plgg-scheme` carries `--pm` + `vp-appearance` unchanged, so the live guide keeps
  its look and visitors' theme survives.
- **D9** (monochrome default + role×variant matrix): the `defaultPalette` travels
  intact into `plgg-scheme`; the palette-override API stays.
- **D10** (mode-agnostic declaration): preserved — `Render` (both modes) is in
  `plgg-ui`; the declaration never encodes a mode.
- **D13** (plggmatic canonical home = this monorepo): **directly reversed** by the
  extraction premise (plggmatic leaves to `../plggmatic`). This trip supersedes D13
  for the package location; the *design system* still originates here via
  plgg-family. Must be recorded as an amendment.

---

### 5. Key structural risk

**The extracted `../plggmatic` is nearly an empty shell today.** Because ~98% of
current code is engine that (correctly, per the concept) becomes plgg-family, what
ships out is: a thin branded re-export facade + the product label + the
design-language default *values* (which §3.2 argues must actually stay in
plgg-scheme so plggpress keeps working) + the concept/specs + the showcase. The
ticket's own Consideration flags this: *"confirm what actually remains
plggmatic-specific so the extracted plggmatic is still coherent and not an empty
shell."*

The tension is genuine: **the code says "almost all engine → plgg-family," but the
concept says "the durable Pragmatic value is the DSL," and the DSL is not built
yet.** So the cut is *structurally* clean and *temporally* awkward — plggmatic
leaves carrying mostly a promise (the DSL + concept) rather than mass. The trip
must decide whether that is acceptable (extract now, let `../plggmatic` grow the
DSL there) or whether extraction should wait until the DSL layer has code mass.
Secondary risk: the `--pm`/prefix ownership (§3.2) — resolve prefix-as-neutral vs
prefix-parameterized before Constructor scaffolds `plgg-scheme`, as it changes the
package's public signature.

---

## Review Notes

_(reviewers add notes here)_
