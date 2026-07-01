# Coding Review — U1 (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Ticket**: U1 — plgg-test self-suite fix (Finding A) + R1 + Gate B
- **Commit**: a12591f (Constructor)
- **Phase/Step**: coding / per-ticket review (step 2, analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve with minor suggestions.**

All three deliverables are present, correctly scoped, and free of
escape hatches (verified: a grep of the added lines for
`as`/`: any`/`<any>`/`as unknown`/`@ts-ignore`/`@ts-expect-error`
returns nothing). The `toBe<string>(...)` occurrences are explicit
type-arguments on the generic matcher, not casts. This review reads the
code only; the Planner runs the suite in parallel.

## 1. Finding A — hook.ts query-strip fix (the trust-critical change)

**Structurally sound and consistent with the existing `load` hook.** The
fix lifts `parent = stripQuery(parentURL)` once, then uses it uniformly
in the three guard predicates (`startsWith("file:")`, `endsWith(".ts")`)
**and** in `new URL(specifier, parent)`. `stripQuery` is the *same*
helper the `load` hook already applies at lines 216 and 248, so the
`resolve` path now matches the `load` path's query-tolerance — exactly
the consistency the ticket asked for. The root-cause diagnosis is
correct: the Runner forms the parent URL as
`${pathToFileURL(file).href}?t=${cacheBust}` (Runner.ts:78), so the
pre-fix `parentURL.endsWith(".ts")` guard rejected every cache-busted
spec parent and dropped the `../index.js`→`../index.ts` redirect.

**Edge-case scrutiny (the lead's specific concern — specifiers that
legitimately contain `?`): no new edge case introduced.**
- `stripQuery` is applied **only to `parentURL`**, never to the
  `specifier`. So a specifier that legitimately carried a query is
  untouched by this code path; only the importing module's own URL is
  normalized.
- `parentURL` is always a `file://…` URL produced by the Runner with a
  single trailing `?t=<digits>` query. On-disk file paths do not
  legitimately contain a bare `?` in the path component (a `?` in a file
  URL is by definition the query delimiter), and the `load` hook already
  truncates at the first `?` for the very same reason — so this fix
  cannot truncate a real path that the rest of the runner would have
  honored. `indexOf("?")`/`slice` truncating at the *first* `?` is the
  correct and already-blessed behavior here.
- The `new URL(specifier, parent)` change is correct and slightly
  defensive: resolving a relative specifier against the stripped parent
  yields a target with no spurious `?t=` to leak into the subsequent
  `.js`→`.ts` replace + `existsSync(fileURLToPath(tsHref))` check. (Even
  pre-fix, `new URL("../index.js", "…spec.ts?t=1")` would not propagate
  the query across the path rewrite, so this is consistency-hardening
  rather than a second bug-fix — worth noting so a future reader does
  not assume two independent defects.)

**Regression spec is apt.** `hook.spec.ts`'s new case is self-
demonstrating: the spec file's own top-of-file `../index.js` /
`../Expect/equals.js` imports are the cache-busted relative-`.js`
imports under test, so the fact that `all`/`deepEqual` are imported and
callable *is* the proof the redirect fires under a `?t=` parent. Clean.

**Concern / trade-off (one, as required): the regression is proven only
implicitly, via the file's own import success — there is no *negative*
or *direct* assertion that `rewriteRelativeTs` returns a `.ts` href for
a `?t=`-carrying parent.** If a future refactor made the self-suite
resolve `../index.js` by some *other* path (e.g. a broadened alias
rule), this test would still pass while the specific query-strip
behavior silently rotted — the test cannot distinguish "the fix works"
from "something else now resolves it."

- **Constructive proposal**: add one direct unit assertion that calls
  the resolver's `resolve(...)` (or, if `rewriteRelativeTs` is not
  exported, export it for test) with `specifier="../index.js"` and a
  synthetic `parentURL="file:///…/hook.spec.ts?t=999"`, and assert the
  returned `url` ends in `index.ts` (and `shortCircuit === true`). That
  pins the query-strip behavior itself, independent of how the file
  happens to load. Minor — the implicit proof is real evidence; this
  just makes the guarantee non-fragile for the change that underpins the
  whole runner.

## 2. R1 — `toBeGreaterThanOrEqual`

**Exact mirror of `toBeGreaterThan`, no weakening.** Same generic bound
`A extends number | bigint`, same `matcher(...)` helper, predicate
`actual >= expected` (vs. `>`), parallel `expected`/`message` formatting,
and the `index.ts` re-export sits beside `toBeGreaterThan` in the
matchers block. The unit test covers the three boundary cases the ticket
required — strictly-greater (`3>=2` pass), equal (`3>=3` pass, the case
that distinguishes it from `toBeGreaterThan`), and less-than (`3>=4`
fail). Correct and complete.

**Observation (trade-off, not a defect): `bigint`-vs-`number`
cross-type comparison.** The bound permits `toBeGreaterThanOrEqual(1n)(3)`
(bigint expected, number actual). `>=` across `number`/`bigint` is valid
JS and TS allows it under this signature, so this is faithful to
`toBeGreaterThan`'s existing contract — but neither matcher's test
exercises a mixed `number`/`bigint` pair.

- **Constructive proposal**: optional — add one mixed-type case
  (`toBeGreaterThanOrEqual(2n)(2)` → pass) to both this matcher's and
  ideally `toBeGreaterThan`'s spec, documenting the cross-type contract.
  Not required for U1 (the single corpus site
  `runFoundry.spec.ts:35` is `size >= 1`, both `number`), but it would
  pin a real edge of the type bound.

## 3. Gate B — deepEqual ≡ vitest toEqual parity spec

**Meets the bar I set in coding-discovery** ("nested-Box assertions;
mechanism tests alone are necessary but not sufficient"). The new block
adds, over real `plgg` values (`ok`/`err`/`some`/`none` imported from
`plgg`):
- **Tag-sensitivity**: `ok(1)` vs `err(1)` → false; `some("x")` vs
  `none()` → false. ✓ (the false-green vector if tags were ignored)
- **Same-tag content-sensitivity**: `ok(1)` vs `ok(2)` → false. ✓
- **Nested Box recursion**: `ok(some(1))` equal; the deeper
  `ok({ items: [some(1), none()] })` equal; `ok(some(1))` vs
  `ok(some(2))` and vs `ok(none())` → false. ✓ — this is precisely the
  nested-Box coverage I required, and it exercises the
  function-property-dropping rule in `equals.ts` that lets two distinct
  `ok(_)` instances (each carrying its own `isOk`/`isErr` closures)
  compare equal, matching vitest.
- **Class instance**: `Point(1,2)` equal / unequal by fields. ✓

Combined with the **pre-existing** equals.spec block (Map/Set, Date/
RegExp, `{a:1,b:undefined}` vs `{a:1}` undefined-prop parity, tag
mismatch, key-count), the corpus shapes the ticket enumerated (class
instances, nested Box Option/Result, Map/Set, undefined-vs-absent) are
**collectively covered**. I am satisfied that `deepEqual ≡ vitest
toEqual` for the 81 `toEqual` corpus sites, conditional on the suite
going green (Planner's E2E).

**Concern / trade-off (one, as required): the undefined-vs-absent
parity is proven on a *plain* object but never on a *Box* value, which
is where it actually bites in this corpus.** vitest's `toEqual` treats
`{a:1, b:undefined}` ≡ `{a:1}`; `equals.ts` replicates this and the old
test covers it — but only for a bare object. plgg `Option`/optional
domain fields routinely produce Box/Datum records with an explicitly-
`undefined` content or property (e.g. a constructed value with an
optional field left `undefined` vs. one where it is absent). A migrated
`toEqual` over such a value relies on the undefined-drop rule firing
*inside* the Box-content comparison, which the Gate B block does not
directly assert.

- **Constructive proposal**: add one assertion to the nested-Box block,
  e.g. `deepEqual(ok({ a: 1, b: undefined }), ok({ a: 1 })) === true`
  (and, if a corpus pattern exists, an Option/Datum with an optional
  field). This closes the last corner of the "undefined-vs-absent"
  parity *in the place the corpus exercises it* and makes Gate B's
  evidence complete rather than mechanism-plus-shallow. Minor — the rule
  is already implemented and unit-proven on a plain object; this extends
  the proof to the Box context.

## Decision rationale

The implementation is correct, minimal, escape-hatch-free, and the
Finding A fix — the change the entire runner's trustworthiness rests on
— is structurally sound and consistent with the existing query-handling
in the `load` hook, with no new resolution edge case for `?`-bearing
inputs. Gate B clears the nested-Box / tag-sensitivity / class-instance
bar I set. None of my three concerns is a defect or a correctness risk;
each is an **additive test-coverage hardening** (a direct resolver-
behavior assertion, an optional bigint/number case, and an
undefined-vs-absent-inside-a-Box case). So this is **Approve with minor
suggestions**, not a revision request: U1 is fit to license the U2 bulk
rewrite as-is, and the suggestions can land here or be folded into the
first U2 ticket's review without blocking.

One cross-reference for the lead: U1 closes R1 + Gate B + Finding A, but
the **DOM-environment blocker** I raised in coding-discovery (4 files
needing `@vitest-environment happy-dom`: example/app + plgg-view
render/application/sandbox) is **out of U1's scope and still
unaddressed**. It must be resolved before U2-example and U2-plgg-view —
flagging here so it is not lost behind U1's green.

## Review Notes

- No test execution performed (per the analytical-review mandate); all
  "pass" claims about the new specs are the Constructor's and the
  Planner's E2E to confirm.
- Verified against commit a12591f: 7 files, +133/-4; the four source/
  spec changes reviewed line-by-line above plus the event-log entry.
