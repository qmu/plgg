---
type: Review
trip: plggmatic-extraction-cut
round: 1
reviewer: Constructor
artifacts-reviewed:
  - directions/direction-v1.md
  - models/model-v1.md
version: 1
---

# Review v1

- **Reviewer:** Constructor
- **Artifacts reviewed:** `directions/direction-v1.md` (Planner),
  `models/model-v1.md` (Architect)
- **Lens:** engineering quality, buildability, production readiness

## Decisions at a glance

- **Direction v1 (Planner): Approve with observations.**
- **Model v1 (Architect): Request revision** — on the package
  *count* (two packages vs one) and on the `--pm-*` ownership
  section, both of which change what Constructor scaffolds.

---

## Direction v1 — Approve with observations

The product framing is right and I adopt its thesis: the engine is
*leverage* (stays, plgg-family), Pragmatic is the *differentiated
product* (ships). §5's honesty about the published-contract cost is
the most valuable contribution — it correctly identifies the
cross-repo seam as the dominant long-term cost.

**Concern 1 — "narrow published seam" is in tension with the
runtime engine's necessarily-broad surface.** §5 argues for cutting
the engine's exported surface "deliberately narrow and stable."
Agreed as a principle, but buildability caveat: the runtime the
Admin consumes (`schedule`/`renderMode`) renders *through*
Layout/Component/Form, and `plggpress/src/Admin/*` already imports
~18 symbols (`declare`, `menu`, `collection`, `action`, `confirm`,
`loaded`, `async`, `query`, `makeRow`, `field`, `schedule`,
`renderMode`, + `Declaration`/`Path`/`SchedulerMsg`/`Scheduled`/
`ScheduledModel` types). A TEA runtime cannot expose a *tiny*
surface — the vocabulary is the surface. **Proposal:** apply the
"narrow" discipline at the *root barrel* (curate `src/index.ts` to
exactly the consumed vocabulary, drop incidental internal
re-exports), not by fragmenting the engine into more packages to
make each surface look smaller — fragmentation *widens* the
cross-repo contract (more packages to version), which cuts against
this very principle (see Model review, Concern 1).

**Concern 2 — "the right small package = the vocabulary and design
language" (§5) collides with the Model.** Direction sends the
`--pm-*` design language *out* with Pragmatic; the Model keeps the
design-language values *in* `plgg-scheme`. These cannot both hold
(cross-artifact coherence, below). **Proposal:** distinguish the
*cluster* from the *npm package* — the plggmatic **cluster**
(package + `plggmatic-example` + `site` + concept/specs) carries
real mass via the showcase, so the extraction is not hollow even if
the `plggmatic` *package* is a small, curated design-system surface.
That reframing satisfies §5's "small but right" without forcing the
values out past a boundary plggpress cannot cross.

---

## Model v1 — Request revision

The structural analysis is excellent: the two-surface mapping (§1),
the module-by-module classification (§2), the dependency-direction
and vendor-boundary verification (§4), and the D1/D13 amendment
catches (§4) are all correct and I affirm them. The revision request
is narrow — the *package count* and the `--pm-*` section — not the
analysis.

**Concern 1 (primary) — two packages (`plgg-scheme` + `plgg-ui`)
costs more than it returns; recommend ONE `plgg-ui` with a `/style`
subpath.** Engineering objections, concrete:

1. **It splits the Component tree.** §3.1 moves `themeToggle` into
   `plgg-scheme` but leaves the rest of `Component/*` in `plgg-ui`.
   `themeToggle` is not the only Style-coupled component — `toast`,
   `colHead`, `checkbox`, `textInput`, etc. reference `cssPrefix`
   (Meta) and `colorVar` (Style/model/token). So either (a) those
   stay in `plgg-ui` and force a `plgg-ui → plgg-scheme` edge that
   re-exports `colorVar`/`Color` as public API — widening
   `plgg-scheme`'s surface *beyond* the Surface-1 list §3.1
   enumerates — or (b) more of Component follows `themeToggle` into
   `plgg-scheme`, scattering the co-located control specs and shared
   `controlParts`/`interaction` helpers across two packages. Neither
   is clean; the Component tree is one rebuildable unit.
2. **It doubles the cross-repo published contract.** Direction §5
   (the biggest risk) says *narrow the seam*. Two published packages
   means `../plggmatic` pins and tracks **two** semver surfaces
   (`plgg-scheme@^` and `plgg-ui@^`) across the boundary, with two
   release coordinations, instead of one. Two packages is the
   *opposite* of narrowing the seam.
3. **It doubles the monorepo wiring + gates.** Two `cd`-lines in
   `scripts/build.sh` (publish order sed-derived — `plgg-scheme`
   before `plgg-ui` before `plggpress`), two `test-*.sh`, two
   `check-all.sh` lines, two `plgg-test.config.json` ≥90 gates, two
   `package.json`/tsconfig/prettierrc, two guide-container provisions.
   Every future engine change touching both trees reconciles two
   packages.
4. **YAGNI.** The only consumer today (plggpress) uses *both*
   surfaces. No current consumer wants theme-without-scheduler, so a
   second package now is speculative.

   **Proposal (maintains the quality bar and keeps the Architect's
   separation goal):** one `plgg-ui` package with **two export
   subpaths** — `plgg-ui` (runtime barrel) and `plgg-ui/style`
   (theme barrel) — exactly mirroring today's `plggmatic` `.` /
   `plggmatic/style` split. This delivers the *same* logical theme↔
   runtime boundary the Architect wants (distinct import surfaces,
   `plgg-ui/style` continues `export * from "plgg-view/style"` +
   scheme-aware shadow) with **zero** Component fragmentation, one
   cross-repo contract, and one gate. The Style tree is genuinely
   separable (bottom layer, deps Meta + `plgg-view/style` only), so
   IF a theme-only consumer later earns it, `plgg-ui/style` promotes
   to a standalone `plgg-scheme` along the *already-existing subpath
   seam* — a clean future split (sacrificial-architecture; mirrors
   D9's "earned-place" doctrine). Modular-monolith-first says split
   when a consumer earns it, not preemptively.

**Concern 2 — the `--pm-*` section (§3.2) leaves plggmatic a bare
label; the parameterization it defers is the fix, and it is
buildable.** §3.2 recommends treating prefix + storage-key +
monochrome default as neutral `plgg-scheme` infra and reducing
plggmatic's `Meta` to "the product label only." That keeps plggpress
green but is exactly the empty-shell outcome §5 then flags as the top
risk — the Model both creates and warns about it. On the buildability
question the lead posed:

- **The values plggpress consumes MUST stay in plgg-family.** I
  concede this against my own v1: plggpress emits `var(--pm-*)` and
  needs `schemeCss`/`colorVar`/the monochrome palette, and it cannot
  import plggmatic (invariant). So the *values* cannot ship out with
  plggmatic. My v1's "plggmatic OWNS the `--pm-*` values" is **not
  cleanly buildable as stated** — I correct it here.
- **But parameterization is buildable with no escape hatch and no
  plggpress→plggmatic dep**, and it is what stops the shell being
  empty. Make the emitters pure `(theme) => css` /
  `colorVar(theme)(c)` where `theme: Theme` is a typed record
  (`{prefix, palette, metrics, syntax, …}`) — a closed domain type,
  no `as`/`any`; the "CSS is emitted statically today" concern
  dissolves because the emitter simply takes its inputs as an
  argument instead of closing over module constants. `plgg-ui/style`
  ships a **neutral `defaultTheme`** (which may be set equal to
  today's monochrome so plggpress stays byte-identical, D3/D16), and
  **plggpress passes that theme explicitly** at its composition root
  — importing `defaultTheme` from `plgg-ui`, never from plggmatic.
  plggmatic then owns the *design-system contract*: the `Theme`
  type + palette-override API as the Pragmatic surface, its branded
  default, and the concept/specs/DSL. Invariant holds
  (plggpress → plgg-ui only); no duplication of the palette bytes
  (one `defaultTheme`, re-branded by plggmatic).
- **Scope/sequencing:** this parameterization is larger than ticket
  A's minimal "plggpress drops plggmatic" goal, so it must be its
  own step *after* a safe A1/A2 re-home that keeps `pm`/monochrome as
  `plgg-ui`'s shipped default (zero behavior change). That is my
  design-v1 A3. **Proposal:** the Model should adopt the
  parameterized-default-theme resolution (or explicitly accept the
  thin-package + grow-the-DSL-there outcome), and record which,
  because §3.2 says the prefix decision "changes the package's public
  signature" — it must be settled before scaffolding.

---

## Cross-artifact coherence

- **The central incoherence: where the `--pm-*` design language
  lives.** Direction (§2, §5, §6) ships it *out* with Pragmatic as
  "the right small package"; Model (§3.2) keeps it *in* `plgg-scheme`
  as neutral infra. This is a real contradiction on the same
  artifact, and it is the load-bearing decision the trip exists to
  settle. **Resolution I propose (reconciles all three):** the
  *values* live in plgg-family as a parameterizable `defaultTheme`
  (Model is right — plggpress needs them, invariant forbids the
  alternative); plggmatic owns the *Theme contract + brand + DSL*
  (Direction is right — that is the durable product surface); and the
  *cluster's* mass is carried by the showcase (`plggmatic-example`,
  `site`), so "small package" ≠ "empty extraction." Everyone is
  partially right; the parameterized `Theme` is the seam that lets
  all three hold at once.
- **Empty-shell risk — all three artifacts converge** that ~98%
  engine → plgg-family is correct and concept-endorsed, and that the
  residual Pragmatic package is thin *today*. Direction and my
  design treat that as acceptable (small-but-right + DSL growth);
  Model §5 leaves it open (extract-now vs wait-for-DSL-mass). I side
  with extract-now: the *cluster* has mass, and gating the extraction
  on an unbuilt DSL blocks tickets B/C indefinitely. Recommend the
  team record "extract-now, grow the DSL in `../plggmatic`" as the
  decision.
- **Dependency-direction + vendor-boundary:** Direction, Model, and
  design all hold the invariant (plggpress/plggmatic → plgg-family
  only; new packages born conformant/unexempted; plggpress stays
  EXEMPT). No conflict. Model's D1/D13 amendment catches are correct
  and should be carried into the decomposition.
- **Dynamic-sources (192518):** neither Direction nor Model addresses
  it; my design re-points it onto the new engine package. Flag for
  the decomposition so it is not stranded.

## Summary of requested changes

1. **Model:** collapse `plgg-scheme` + `plgg-ui` into one `plgg-ui`
   with a `plgg-ui/style` subpath (theme↔runtime boundary preserved,
   promotable later); OR justify the second package against the
   doubled cross-repo contract + Component-tree split.
2. **Model:** settle the `--pm-*` signature question — adopt the
   parameterized `defaultTheme` resolution (plggmatic owns the Theme
   contract/brand, values stay in plgg-ui) or explicitly accept the
   thin-package outcome — before scaffolding.
3. **Direction:** reconcile "design language ships out" (§5/§6) with
   the values-stay-in-plgg-family constraint via the cluster-vs-
   package distinction.

## Review Notes

_(author responses appended here)_
