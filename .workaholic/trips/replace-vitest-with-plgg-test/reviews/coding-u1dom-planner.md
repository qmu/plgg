# Coding Review — U1-dom (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U1-dom — happy-dom DOM-environment seam for plgg-test
  (directive detection, install-before-import, per-file teardown, two
  fixtures)
- **Implementation under test**: Constructor commit `f29da9c`
- **Status**: validated
- **Decision**: **PASS — Approve with one observation**

## Content

All validation executed via the runner CLI (my QA domain). plgg-test was
rebuilt before testing (its source changed); `happy-dom@^15` is confirmed
installed.

### 1. Self-suite green — PASS

`bash scripts/test-plgg-test.sh`:

```
86 passed, 0 failed, 0 skipped
```

Up from the U1 baseline of 84 — the +2 are the two new
DOM-seam-driving tests in `Core/Runner.spec.ts`. Exactly the count the
Constructor claimed.

### 2. DOM fixture exercises a real DOM — PASS

The fixture `fixtures/_domFixture.spec.ts` carries the
`// @plgg-test-environment happy-dom` directive and accesses the DOM in
two places that matter:

- **Module-eval time** (top level): `const eager =
  document.createElement("div"); eager.textContent = "hi"` — this only
  loads if `document` is on `globalThis` **before** the module is
  imported, which is the load-before-import guarantee the seam exists to
  provide.
- **In test bodies**: `document.createElement` is a function,
  `window.document` is an object, and a created `<span>` has
  `getBoundingClientRect`.

The driving test `"a @plgg-test-environment happy-dom spec gets a DOM"`
(`Runner.spec.ts:78`) runs the fixture via `runFile` and asserts
**3 passed / 0 failed** — i.e. all three DOM bodies AND the module-eval
access succeeded. That test is green within the Core run (below), so the
seam genuinely installs a working DOM. Confirmed `document.createElement`,
`getBoundingClientRect`, and `window` are all exercised.

### 3. Leak isolation — PASS (the check that matters most)

The driving test `"no-directive spec stays DOM-free even right after a
DOM spec"` (`Runner.spec.ts:92`) is the cross-file leakage guard for a
global-mutating seam. It:

1. runs the DOM fixture (`runFile(_domFixture.spec.ts)`) — installs a
   DOM,
2. then immediately runs `_noDomFixture.spec.ts`, asserting **1 passed /
   0 failed** (its body asserts `"document" in globalThis === false`), and
3. asserts `check("document" in globalThis, toBe(false))` in the runner
   process itself.

So after a DOM file, the very next no-directive file sees no `document`,
and the runner's own `globalThis` is clean. Running the `Core` directory
gives:

```
13 passed, 0 failed, 0 skipped
```

(7 Runner.spec + 6 Reporter.spec; zero `✗`), which includes this
leak-isolation test green. **The per-file teardown does not leak the DOM
across files** — the highest risk in this seam is retired by an executed,
passing test.

### 4. DOM-free path unaffected — PASS

`fixtures/_noDomFixture.spec.ts` has no directive and asserts `document`
is absent under plain Node; it passes both standalone (driven inside the
leak test, 1 passed) and as the second file after a DOM file. This is the
proof the seam is **opt-in**: DOM-free packages (the majority of the
monorepo) keep running under plain Node with no happy-dom load and no
behavior change.

### 5. Watch + coverage — PASS

- **Watch**: started `--watch`, observed initial run `86 passed`,
  touched `Core/Runner.spec.ts` → `change detected, re-running…` →
  `86 passed`, SIGINT stopped it cleanly (no orphan PID).
- **Coverage** (`npm run coverage`):

  ```
  Statements :  95.10% (1708/1796)
  Branches   :  86.70% (163/188)
  Functions  :  94.31% (199/211)
  Lines      :  95.10% (1708/1796)
  Coverage gate passed (all four metrics > 85%)
  ```

  Matches the Constructor's reported 95.11% / 86.70%. The new seam source
  `src/Env/dom.ts` is itself instrumented at **97.27%** — the new
  capability is *not* excluded from the gate, which is exactly the
  protection-preserved behavior criterion 2 wants: the code that adds the
  DOM seam is covered, not hidden.

### Observation (per Critical Review Policy) — the fixtures dir is a
runner trap if anything ever points discovery at it

While validating, I confirmed the fixtures are loaded **programmatically**
by `Runner.spec.ts` via `runFile()`, not discovered as a normal suite —
and correctly so, because `fixtures/` also contains deliberate
failure/rejection fixtures (e.g. a "fire-and-forget rejection" fixture).
Pointing the runner at `fixtures/` directly produces failures **by
design**. This is fine today because `npm run test` targets `src` and the
fixtures live outside it. But it is an implicit invariant: if any future
script, glob, or coverage config ever widened discovery to include
`fixtures/`, the suite would go red on intentional fixtures and a
maintainer would burn time on a non-bug.

- **Proposal**: This does not block U1-dom — I am passing it. As a U3
  hardening item, make the invariant explicit: either a one-line comment
  in `fixtures/` (or its directory README) stating "loaded only via
  `runFile` from Runner.spec; never add to discovery — contains
  intentional-failure fixtures," or confirm the discovery glob in
  `Discovery/find.ts` is anchored to `src` so `fixtures/` cannot be
  swept in. Carrying this as a documented U3 line item keeps a future
  contributor from a confusing red and protects criterion 4
  (contributor-friendliness of the runner).

## Review Notes

- **Decision: PASS — Approve with one observation.** Self-suite 86/0/0
  (from 84), DOM fixture proves a real DOM at module-eval + in bodies
  (3 passed), leak isolation green (no cross-file DOM leak; runner
  `globalThis` clean), DOM-free path unaffected (opt-in seam), watch
  runs/reacts/stops cleanly, coverage gate holds at 95.10/86.70 with the
  new `Env/dom.ts` seam itself covered at 97.27%. Nothing red.
- As the lead noted, the 4 production DOM specs (plgg-view/example) are
  intentionally **not** converted in U1-dom — this ticket only adds the
  runner capability + fixtures, so view/example are correctly out of
  scope here and remain blocked behind the case-collision (Finding B from
  my launch baseline) for their own U2 tickets.
- Observation is a U3 documentation/hardening item with a concrete
  proposal; no rework requested.
