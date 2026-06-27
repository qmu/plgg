# Coding Review — T4 (parser + fs ACL + readMigrations) — Architect

- **Reviewer**: Architect (analytical / code + architectural review; no test execution)
- **Ticket**: `20260627210148-parser-fs-and-plan.md`
- **Verdict**: **Approve with minor suggestions**

---

## 1. Parser correctness & dbmate fidelity — solid, one real edge (mostly ✓)

`parseMigration` is pure (text → `Result`), keeps each body **whole** (no
`;`-split, applied via `runScript` in T5), and handles the core cases correctly:
- markers `^\s*--\s*migrate:(up|down)\b` — case-sensitive (no `i` flag, per
  dbmate), whitespace- and CRLF-tolerant (`text.split(/\r?\n/)`), `\b` prevents
  `migrate:upfoo` from matching ✓
- `transaction:false` directive parsed per-section into `up/downTransaction`
  (default `true`; `downTransaction` defaults `true` when down is absent) ✓
- missing `-- migrate:up` → `ParseFailure` ✓; missing `-- migrate:down` →
  `down: None` (irreversible, my D1) ✓
- `noUncheckedIndexedAccess` handled (`lines[index]` via `fromNullable`+`getOr("")`) ✓

**Robustness edges (Q1).** Most are benign, one is not:
- *Duplicate markers* — a second `-- migrate:up`/`-- migrate:down` is taken as the
  first match by `findIndex`; the extra marker line falls **inside** a body and
  becomes a harmless SQL comment, and its SQL still runs. So duplicates are
  absorbed, not corrupted — acceptable, worth a test to pin the behavior.
- *A literal `-- migrate:down` line inside the up SQL* would be mistaken for the
  marker — but this is inherent to the marker format (dbmate has the identical
  property). Not a gap; worth one doc line.
- **Concern C1 (the one with trust impact): content *before* the first
  `-- migrate:up` is silently dropped while the version is still recorded as
  applied.** `section()` starts the up body at `upIndex + 1`, so any SQL a
  developer writes above the up marker (thinking it is part of "up") never
  executes — yet `migrateUp` will `INSERT` the version and report success. That is
  a silent loss of *authored schema intent* on a tool that touches production
  schema. **Proposal**: if there is any non-whitespace content before the first
  `-- migrate:up` marker, fail with `ParseFailure` ("SQL found before the
  '-- migrate:up' marker") and add a test. (Confirm dbmate's exact behavior here;
  either way, recording a version while dropping authored SQL is the risk to
  close.) An empty up *body* (marker present, nothing after) is the milder cousin
  — currently allowed as a no-op-but-recorded migration; at least worth a test.

## 2. The no-proc decision — correct (✓)

Avoiding `proc` to keep the channel exactly `MigrationError` is the **right
structural call**: `proc` folds thrown exceptions into a `Defect`, widening the
error type to `MigrationError | Defect`, which — under the no-`as` rule — could not
be narrowed back to the declared `PromisedResult<MigrationDir, MigrationError>`
contract. Since `vendors/fs` already folds every rejection to a value-level
`MigrationError` (nothing throws), there is no exception to catch, so `proc` would
add a phantom `Defect` arm for no benefit. Using `.then` + `matchResult` keeps the
contract honest. Endorsed.

## 3. fs ACL boundary — clean (✓)

`vendors/fs.ts` is the **only** `node:fs` touch: `readdir`/`readFile`/`writeFile`/
`mkdir` (+ pure `node:path` `join`/`dirname`), each folding a rejected promise to
an `IoFailure` via the same `.then(ok, err)` seam shape as plgg-sql. `readMigrations`
imports from `vendors/fs`, never `node:fs` — dependency direction closed toward the
domain (domain-layer-separation holds). `readFileText` never rejects (folds to
`Result`), so the `Promise.all` in `readAll` cannot reject — no unhandled-rejection
path. ✓

## 4. IoFailure kind — coherent (✓)

`IoFailure` is the fs ACL's boundary failure mode — exactly the per-boundary-kind
principle I endorsed for `VersionShape`/`TenantShape` in T3. A real failure mode,
not scope creep. Keep it.

## 5. Gives T5 what it needs — yes (✓)

`ParsedMigration` → `Migration` (`toMigration` joins filename `Version`/`name` with
the parsed parts via `migration()`), `readMigrations` returns the ordered,
dedup-checked `MigrationDir`, and the **body-whole** contract is preserved for
`runScript`. `planMigrations` is correctly **deferred to T5** (the ticket body says
so explicitly — "the pure `planMigrations` diff is in the apply/dry-run ticket");
the ticket *slug* "…-and-plan" is vestigial, not an unmet requirement.

## Secondary suggestions (minor / optional)

- **C2 (readability, optional).** The nested `matchResult` ladders in `toMigration`
  and `readAll` re-implement bind/map. plgg exposes `resultChain.chain(f)` (bind)
  and `resultFunctor.map(f)` — both preserve the exact `MigrationError` channel
  (no `proc`, no `Defect`) — so the ladders could read more linearly *if* the team
  is comfortable with the HKT-dictionary idiom (the rest of the package favors
  `matchResult`). The hand-rolled `sequenceResults` is, by contrast, a **justified**
  local helper: plgg's `conclude` *gathers* errors into siblings, whereas this path
  wants **fail-fast** array sequencing, which isn't a one-liner in plgg. Leave
  `sequenceResults`; consider the chain/map cleanup only if it improves readability
  for you. Not a correctness issue.
- **Determinism nit (low).** `readAll` reads files in `readdir` order (OS-dependent)
  and `sequenceResults` returns the *first* error in that order — so which parse
  error surfaces first is nondeterministic across filesystems. The *final*
  `MigrationDir` is sorted by `asMigrationDir` regardless, so only error-selection
  ordering is affected. Optional: sort the `.sql` filenames before reading for
  deterministic error reporting.

## Decision

**Approve with minor suggestions.** The parser is faithful to the dbmate format,
the no-proc decision is the correct way to keep the precise `MigrationError`
channel, the fs ACL cleanly isolates `node:fs`, and `IoFailure` is a coherent
boundary kind. The one item I want addressed is **C1** (reject — or at minimum
test + document — SQL before the `-- migrate:up` marker, so authored schema is
never silently dropped while the version is recorded); it is parser-local and
low-cost. Everything else is optional polish; nothing needs re-review beyond C1's
small parser guard. T5 is unblocked.
