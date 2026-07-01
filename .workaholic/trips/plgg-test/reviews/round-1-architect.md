# Round 1 Review — Architect

Reviewer: Architect (Neutral — translation fidelity & boundary integrity lens)
Artifacts reviewed:
- `directions/direction-v1.md` (Planner)
- `designs/design-v1.md` (Constructor)

Lens for this review: does the chain business-intent → structural
model → design hold together without loss, and are the component
boundaries (runner / discovery / expect / reporter / watcher /
coverage / resolver) and the **zero/near-zero third-party dependency**
boundary actually preserved by the design? I verified the design's
load-bearing counts against the repo before reviewing (see §3).

---

## Artifact 1 — `directions/direction-v1.md`

**Decision: Approve with minor suggestions.**

The direction is coherent and translatable. Its six success criteria
each map cleanly onto exactly one structural component in my model
(authoring DSL, runner-core parity, reporter/exit-code, watcher,
coverage, dependency boundary) — there is no business intent left
without a structural home, and no structural component invented
without a business driver. The "verdict parity, then removal" north
star (SC2) is especially valuable structurally: it gives the design a
falsifiable gate that protects the one existential risk (false
greens), and the design adopted it verbatim (design §3.2.4). The
honest-coverage clause (SC5) is well-judged — it permits the design to
treat coverage as a separable component rather than a blocker.

**Concern (translation fidelity): SC1 "minimal edits" understates one
real, repeated edit.** The direction frames migration as "ideally just
the import source," which reads as near-free. But that edit is ×132
files (100% of the corpus imports from `"vitest"`), and there are two
files (`vi.mock` / `stubGlobal` class) that need more than a string
swap. As written, a reader could under-budget the migration and treat
any per-file friction as a design failure rather than expected work.

*Concrete structural proposal:* tighten SC1 to name migration as a
**single scripted codemod over the import source** (one mechanical
transform applied to all files, verified by the parity gate), plus an
**explicitly enumerated short list of hand-touched specs** (the
`vi.mock` seam). This keeps "minimal" honest and measurable — the
design already implies exactly this (§3.2 steps 2–3); the direction
should make the two-tier shape (bulk codemod + named exceptions)
explicit so success is judged against the right target.

**Minor:** SC6 ("dependency reduction realized") is currently
qualitative. Since it is the trip's raison d'être, consider stating
the measurable form already implied — drop `vitest` and
`@vitest/coverage-v8` and confirm the lockfile subtree shrinks — so
the win is demonstrated, not asserted (consistent with the direction's
own "trust by demonstration" stance).

---

## Artifact 2 — `designs/design-v1.md`

**Decision: Approve with observations.**

This is a strong, faithful realization of both the direction and the
structural model. It is grounded in verified repo facts (I
independently re-checked its headline counts — see §3), it honors the
zero/near-zero-dependency boundary as a hard constraint, and its
component decomposition (§2.2: `Core/` registry+runner+reporter,
`Expect/`, `Assert/`, `Mock/`, `Discovery/`, `Watch/`, `Coverage/`,
`Resolve/`, `Cli/`) lines up almost one-to-one with the model's L0–L3
taxonomy. The boundary discipline is exactly right: native Node
strip-types as the primary TS-execution path (no bundler), `fs.watch`
for watch, `NODE_V8_COVERAGE` for coverage, `module.register` for
resolution — every effectful component sits on a Node built-in, and
the only runtime dep is `plgg` itself (dogfooding house style). The
self-test bootstrapping concern (the "both broken the same way" blind
spot) is handled thoughtfully with the plain-`throw` meta-harness
(§3.1) — that is a genuinely good structural insight I did not have in
the model, and it directly defends SC2.

**Primary concern (boundary integrity — the one drift to resolve):
the coverage path silently re-expands the execution boundary.**
§1.8 chooses `NODE_V8_COVERAGE=<dir>` and says "spawn the run with that
env var." But the runner's *primary* execution model (§1.6, §2.3) is
in-process: import each spec into a module-level registry and walk the
tree in the current process. `NODE_V8_COVERAGE` is a **process-level**
sink — it captures coverage for the process it is set on. To use it,
either (a) the CLI must be the process that already has the env var set
(re-exec/spawn a child with `NODE_V8_COVERAGE` + the same
`--experimental-strip-types --import register` flags), or (b) coverage
must be driven in-process via a `node:inspector` `Session`
(`Profiler.takePreciseCoverage`) instead. The design names
`node:inspector` nowhere and `NODE_V8_COVERAGE` implies (a), but the
spawn/re-exec step is not in the build order (§4) or the CLI
description (§2.3) — so the coverage component's relationship to the
runner process is **structurally underspecified**, which is exactly
where a subtle wrong-numbers / empty-report failure hides. This is the
highest-uncertainty component in my model, so it deserves an explicit
boundary decision, not an implicit one.

*Concrete structural proposal:* make the process model of coverage
explicit and pick one seam. Recommended: **`node:inspector` Session in
the same process** as the runner (start profiler → run tree →
`takePreciseCoverage` → stop), which keeps coverage inside the
in-process execution model the rest of the design already commits to
and needs no child-process orchestration. If `NODE_V8_COVERAGE` is
kept instead, add the **re-exec-with-env step** to both the CLI flow
(§2.3) and the build order (§4) so the spawned child carries the env
var *and* the strip-types/register flags. Either way, the doc should
state which process produces the V8 ranges. (The SC5 honesty clause
already covers the statements-granularity question; this is the
distinct, prior question of *where* coverage is collected.)

**Observation 2 (translation fidelity — the resolver is the real
critical path, treat it as such).** §2.1's `module.register` resolver
hook is the single component the whole TS-execution story rests on, and
it must reproduce what vite's `resolve.alias` gives for free today:
intra-package `plgg/index` → `./src/index.ts`, `plgg/Functionals/bind`
→ `./src/Functionals/bind.ts`, *and* cross-package bare `"plgg"` →
built `dist`. The design correctly identifies this but lists it as one
bullet in build order. Structurally it is the riskiest fidelity seam
after `toEqual`: if it mis-resolves, specs fail to import and the whole
suite is red for reasons unrelated to the code under test. *Proposal:*
elevate the resolver to its own acceptance check in §3 — a fixture
spec exercising all three specifier shapes (self-`/index`,
self-`/deep/path`, cross-package bare) that must import and run before
any migration begins. This makes the model's "alias resolution is the
concrete hard part" risk a gated checkpoint, not a hopeful bullet.

**Observation 3 (fidelity — name `toEqual` parity as a gated item).**
The design lists `toEqual` (348×) as "deep structural equality" and
relies on the parity gate to catch divergence. That is the correct
strategy, but `toEqual` is the #1 false-green vector in my model
because all 348 calls flow through one equality algorithm and vitest's
`toEqual` has specific rules (ignored `undefined` props, Map/Set/Date
handling). *Proposal:* in §3.1, add `toEqual` deep-equal to the
meta-harness's explicit primitive checks (alongside the failing/passing
`expect` and async-rejection cases), exercising the plgg shapes the
corpus actually compares (`Datum`/`Dict`, Result/Option, nested
arrays/objects with `undefined` fields). Cheap, and it converts the
subtlest correctness chokepoint from "trust parity" to "directly
verified."

---

## Cross-artifact coherence note

The direction → model → design chain is coherent and the dependency
boundary holds end-to-end with one exception to close.

- **TS execution:** design's native-strip-types + `module.register`
  choice (§2.1) stays inside the boundary the model and direction
  require — no bundler, no transpiler-as-library. It correctly rejects
  `tsx` (which would reintroduce esbuild and undercut SC6). **Coherent.**
- **Watch:** `fs.watch` recursive + debounce (§1.7) is a Node built-in,
  matches the model's L2 watcher and the direction's SC4. **Coherent**
  (watch-reliability caveats noted in both, mitigations aligned).
- **Coverage:** this is the **one structural drift to resolve before
  the gate** — not a boundary *violation* (V8 via Node is still
  in-family), but a boundary *ambiguity*: the in-process runner vs. the
  process-level `NODE_V8_COVERAGE` sink are not reconciled (design
  artifact §1 above). Until §1.8 names the collection process, the
  coverage component's place in the execution boundary is undefined.
- **Mocking:** both artifacts converge on isolating `vi.mock` to one
  refactored seam with a loader-hook fallback as a named follow-up —
  consistent with the model's "isolate the one outlier" and the
  direction's permission to refactor low-quality seeds. **Coherent.**
- **Command-scripts policy:** design §2.3 keeps the canonical
  per-package runner family and only changes what npm scripts invoke —
  faithful to the model's boundary note and
  `feedback_command_scripts_policy`. **Coherent.**

Net: no artifact needs to be sent back; the design's coverage
process-model is the single item I want named (not redesigned) so the
zero-dependency-execution boundary is unambiguous end-to-end.

## Summary of decisions

- `directions/direction-v1.md`: **Approve with minor suggestions**
  (tighten SC1 to a two-tier codemod + named exceptions; make SC6
  measurable).
- `designs/design-v1.md`: **Approve with observations** (name the
  coverage collection process — recommend in-process `node:inspector`;
  elevate the resolver and `toEqual` to gated checks).
