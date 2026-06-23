# Coding-Phase E2E — plgg-kit Cross-Package Smoke (Planner)

Author: Planner (E2E / external-interface QA)
Status: complete
Validated against: Constructor's committed code at `c23b0ce`, plgg
dist built via `scripts/build.sh`, plgg-kit deps installed.
Method: external execution on temp copies under the session
scratchpad; the real plgg-kit specs were NOT mutated.

## Headline

- **Item 1 — cross-package bare `"plgg"` resolution: PASS.** plgg-kit
  specs that do `from "plgg"` (→ `file:../plgg` built dist) run
  correctly under plgg-test; verdict parity with vitest is exact on
  those specs.
- **Item 2 — `vi.mock`→`postJson` injection (Amendment 2): NOT DONE
  YET / cannot validate.** plgg-kit has not been migrated; the spec
  still uses `vi.mock("plgg")`, and `generateObject` has no injection
  seam. This is Constructor Iteration-1 product work that does not yet
  exist. Details + a concrete scope warning below.

---

## Setup

- Installed `packages/plgg-kit` deps (`npm install`); `plgg` is linked
  via `file:../plgg` (symlink `node_modules/plgg -> ../../plgg`).
- Ran `scripts/build.sh` (dependency-ordered). plgg's dist bundle
  (`dist/index.es.js`, `dist/index.cjs.js`) is present and fresh — this
  is what bare `from "plgg"` resolves to. NOTE: `build.sh` printed a
  `MODULE_NOT_FOUND` while building `plgg-sql` (its deps aren't
  installed in this worktree) and the script swallows the error, but
  plgg's own dist built fine, which is all the plgg-kit smoke needs.
- Did not stage any dist artifacts (gitignored).

## Item 1 — Cross-package resolution + verdict parity: PASS

plgg-kit has 5 specs. 4 do NOT use `vi.mock` and exercise cross-package
`from "plgg"`:
`Provider.spec.ts`, `Anthropic.spec.ts`, `OpenAI.spec.ts`,
`Google.spec.ts`. On a temp copy I codemodded their import source
`"vitest"`→`"plgg-test"` and ran them under plgg-test:

- **plgg-test:** `8 passed, 0 failed, 3 skipped`, exit 0.
- **vitest (same 4 specs, baseline):** total 11 → `8 passed, 0 failed,
  3 skipped`.
- **Verdict parity: identical** (8/0/3 both sides).

The 3 skipped are the live-API `test.skip(...)` cases in the vendor
specs (Claude/OpenAI/Gemini real invocation). plgg-test correctly
honors `test.skip` (counts them skipped, does not run them) — matching
vitest.

This confirms the resolver hook falls through bare `"plgg"` to the
built dist correctly (Architect verified structurally; this is the
runtime confirmation), and that plgg-kit's own `plgg-kit/index` /
`plgg-kit/...` aliases resolve via tsconfig paths under the hook.

## Item 2 — `vi.mock`→`postJson` injection (Amendment 2): NOT DONE; cannot validate as-is

State of the real tree (NOT a temp copy):
- plgg-kit's 5 specs **all still import from `"vitest"`** (0 migrated to
  `plgg-test`). plgg-kit migration has not happened — only `plgg` was
  migrated in `c23b0ce`.
- `generateObject.spec.ts` **still contains `vi.mock("plgg",
  async (importOriginal) => …)`** overriding `postJson` with canned
  per-vendor responses. The conversion to dependency injection has not
  been applied.
- `generateObject.ts` has **no injectable `postJson` seam**: its
  signature is `generateObject({provider, systemPrompt, userPrompt,
  schema})`. It calls `reqObjectGPT/reqObjectClaude/reqObjectGemini`,
  and `postJson` is invoked deep INSIDE those request builders — it is
  not even referenced directly in `generateObject.ts`.

Therefore I could not validate "the injected default still calls the
real `postJson`" — there is no injection to test yet, and standing one
up would mean writing Constructor's product code (out of my QA role).

**Scope warning for Constructor / lead (this is the important part):**
Amendment 2 framed the `vi.mock`→`postJson` conversion as a small,
single-file edit. In reality it is a **multi-layer product-code
refactor**: to inject `postJson` into `generateObject` and have it
reach the network call, the seam must be threaded from
`generateObject` down through `reqObjectGPT/Claude/Gemini` (or those
builders must take an injectable client). That is a behavior-sensitive
change across several `plgg-kit` source files, each needing the "real
default still calls real `postJson`" guarantee. It is still bounded and
the right call (vs building an ESM module-mock engine), but it is NOT
trivial and is currently UNDONE. Until it lands:
- plgg-kit cannot be fully migrated off vitest (this one spec blocks
  it), so the SC6 dependency-drop for plgg-kit is not yet achievable;
- the migration's single product-code edit (my earlier round-1 Design
  Concern 2 and routed item O3) must be verified once written.

## Verdict summary

| Item | Result |
|---|---|
| Cross-package bare `"plgg"` resolution runs under plgg-test | PASS |
| plgg-kit cross-package verdict parity vs vitest (4 specs) | PASS (8/0/3 == 8/0/3) |
| `test.skip` honored (live-API cases) | PASS |
| `vi.mock`→`postJson` injection done | NOT DONE (Constructor Iteration-1) |
| Injected default calls real `postJson` | UNTESTABLE until the seam exists |

No blocker to the headline plgg parity (already PASS). The plgg-kit
full migration is gated on the `postJson`-injection refactor, which is
larger than "one spec" and belongs to Constructor.

## Review Notes

(none yet)
