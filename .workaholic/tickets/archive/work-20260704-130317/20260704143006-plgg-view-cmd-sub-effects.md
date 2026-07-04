---
created_at: 2026-07-04T14:30:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: c00e29a
category: Added
depends_on: []
---

# plgg-view effects: `update` returns `[Model, Cmd<Msg>]`, the runtime gains `Sub` — breaking, all consumers in one branch

## Overview

Phase 2 (Effects), ticket **06** of the plggpress/plggmatic roadmap —
implements **D2** ("Add Cmd/Sub to plgg-view itself — `update: (msg, model) =>
[Model, Cmd<Msg>]` plus subscriptions. Breaking change, accepted") from the
approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. The custom
subscription seam must be able to express the future WebSocket/audio channel
of the Realtime voice agent (**D12**, ticket 25) — proven here with a fake,
not by shipping any Realtime code.

Today both runtimes are deliberately effect-free: `sandbox.ts` documents
"**No `Cmd`, no `Sub`**", and `application.ts` calls its URL reflection "a
render-time effect (NOT a `Cmd`)". Nothing can run on a timer, debounce, or
subscribe to an ongoing source. The 2026-06-13 research spike (see Related
History) already designed this feature; its recommendation was to keep
`sandbox` pure and add an `element` program *alongside*. **D2 amends that
recommendation**: there is one signature, on the existing runtimes, and the
break is taken openly (breaking-changes-OK — plgg is its own only consumer).
Record the amendment in the runtime doc comments, the same way ticket 03
records its doctrine amendment.

What ships:

1. **`Cmd<Msg>` and `Sub<Msg>` as pure data** (closed unions in
   `Program/model/`), constructed by app code, **executed only by the
   runtime** — `update` stays a pure, unit-testable function that *returns*
   effects and never performs them.
2. **Cmd primitives**: `none`, `batch`, and *effect-from-deferred-computation*
   (a thunk producing `Msg` through plgg's `proc`/Promise vocabulary). The
   effect variant IS the typed custom-effect seam: HTTP via plgg-fetch,
   timers, or D12's ephemeral-key minting are all expressible as data wrapping
   a deferred computation, with zero plgg-view edits.
3. **Sub primitives**: `interval`, browser/window events (e.g. global
   `keydown`), and a **custom subscription** — a keyed descriptor
   `{ key, start: (dispatch) => cleanup }` that a WebSocket/audio channel
   plugs into later.
4. **Runtime loop**: `dispatch` folds `update`, paints, then executes the
   returned `Cmd` and re-diffs `subscriptions(model)` by key (start new keys,
   tear down removed keys, keep surviving subscriptions running — continuity,
   no restart churn). Teardown integrates with the existing cleanup return.
5. **Migration of ALL existing consumers in one branch** — the roadmap's
   phase-2 gate: `packages/example` (isomorphic To-Do, 25 specs),
   `packages/plggmatic-example` (workbench, 11 specs),
   `packages/plgg-view/example.ts` (counter), plus every "no Cmd/Sub" prose
   site. SSR is unaffected: `renderToString` and the `Html` model are not
   touched, and plgg-server's re-export surface does not change.

No new package and zero new dependencies, so `scripts/npm-install.sh`,
`scripts/build.sh`, and `scripts/check-all.sh` must **not** change — plgg-view
and both examples are already wired in.

## Policies

- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer and `as`/`any`/`ts-ignore` are prohibited;
  this migration leans on it entirely: changing the `update` return type makes
  every un-migrated consumer, spec, and doc example a `tsc` error, so the
  "all consumers in one branch" gate is machine-checked. Prettier
  `printWidth: 50` governs every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage thresholds are
  enforced per package; `packages/plgg-view/plgg-test.config.json` gates at
  threshold 89 (recorded V8-branch-ruler rationale; statements/functions/lines
  measure 94–98%), excluding only `/index.ts`, `/client.ts`, `/styleEntry.ts`.
  The new `Cmd`/`Sub` model and runtime modules are all *counted* — they must
  arrive fully spec'd, in the house one-spec-per-module convention.

## Key Files

- `packages/plgg-view/src/Program/usecase/sandbox.ts` — `Sandbox<Model, Msg>`
  (`update: (msg, model) => Model`) and its runtime; the "No `Cmd`, no `Sub`"
  doc comment to amend. Center of the ticket.
- `packages/plgg-view/src/Program/usecase/application.ts` —
  `Application<Model, Msg>` + the `dispatch → update → paint → reflectUrl`
  loop; the URL reflection comment ("NOT a `Cmd`") stays true — see
  Considerations. The `Cmd`/`Sub` execution hooks land in this loop.
- `packages/plgg-view/src/Program/usecase/sandbox.spec.ts`,
  `application.spec.ts` — existing runtime specs (`@plgg-test-environment
  dom`, in-house navigation-inert DOM, afterEach teardown discipline); the
  pattern the new effect/subscription specs follow.
- `packages/plgg-view/src/Program/model/Url.ts` — the model-layer precedent;
  new siblings `Cmd.ts` and `Sub.ts` live here (pure data, DOM-free).
- `packages/plgg-view/src/Program/usecase/render.ts` — the injectable
  `Wiring`/`play` seam: the existing precedent for "imperative machinery
  behind an injectable seam" that the effect executor mirrors for
  testability.
- `packages/plgg-view/src/client.ts` — the `./client` export surface
  (`sandbox`, `application`, `makeUrl`); gains the `Cmd`/`Sub` types and
  constructors. `src/index.ts` stays Html-only.
- `packages/plgg-view/example.ts`, `packages/plgg-view/README.md` — sandbox
  counter demo + README; both state "no `Cmd`/`Sub`" and must migrate.
- `packages/plgg-view/plgg-test.config.json` — threshold 89 + excludes;
  unchanged, cited by the gate.
- `packages/example/src/app.ts` — `update` (~line 196) and
  `app: Application` (~line 1093); `Toast`/`ToastDismissed`
  (lines ~67/133/285) is the concrete `Cmd` driver (auto-dismiss). Imports
  types from `plgg-view/client`.
- `packages/example/src/app.spec.ts` — 25 pure-`update` specs; every
  assertion on `update`'s return value changes shape.
- `packages/example/src/server.ts`, `main.ts` — SSR half imports `app.ts` in
  Node, so `Cmd`/`Sub` model modules must never touch `window`/`document`
  outside the runtime interpreter; CSR entry `main.ts` mounts unchanged.
- `packages/example/src/Todo.ts` — header comment already anticipates "a
  future plgg-view `Cmd`/effects phase" (line 6); the HTTP-backed variant it
  sketches stays future work.
- `packages/plggmatic-example/src/app.ts` (`update` ~line 202, `app` ~line
  676), `app.spec.ts` (11 specs), `main.ts` — the second `application`
  consumer.
- `packages/guide/packages/plgg-view.md` — guide page built around the
  "no `Cmd`/`Sub`" boundary (multiple sections); rewrite for effects-as-data.
- `packages/plgg-server/src/View/usecase/renderToString.ts` — re-exports
  plgg-view's SSR fold; must need **no diff** (the SSR-unaffected proof).

## Related History

- `.workaholic/tickets/archive/work-20260531-003055/20260613183140-research-effects-and-subscriptions.md`
  — the design spike this ticket implements: effects-as-data behind an
  injectable seam, `Cmd` set, `Sub` diffing-by-key with `stop()`-style
  teardown, cancellation analysis. Its "keep `sandbox` pure, add `element`
  alongside" recommendation is **amended by D2** (one signature, open break);
  its effects-as-data, key-diffing, and injectable-interpreter conclusions
  carry over unchanged. Story: `.workaholic/stories/work-20260531-003055.md`.
- `.workaholic/tickets/archive/work-20260531-003055/20260604013259-plgg-view-url-model-reflection.md`
  — established the "render-time effect interpreted by the runtime"
  precedent (`toUrl`/`historyMode` as data on the program, imperative seam
  confined to the runtime) that `Cmd`/`Sub` generalize.
- `.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md`
  and `20260609185443-plgg-view-keyed-reconcile-flip.md` — both deferred
  sequenced motion orchestration (`animationend → Msg`) to "the effects
  ticket"; this ticket ships the *seam* it needs (custom `Sub`), not the
  orchestration itself.
- `.workaholic/tickets/archive/work-20260531-003055/20260613183141-research-event-payload-and-preventdefault-model.md`
  — event-decoder research; the window-event `Sub` here uses a minimal
  `(event) => Option<Msg>` filter and leaves the rich decoder/preventDefault
  model to that ticket's scope.
- `.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md`
  — plgg-view's origin: the effect-free minimum was a deliberate starting
  point, not a doctrine; D2 is its planned outgrowth.

## Implementation Steps

1. **`Cmd<Msg>` model** (`packages/plgg-view/src/Program/model/Cmd.ts`): a
   closed discriminated union — `none`, `batch(ReadonlyArray<Cmd<Msg>>)`, and
   `effect` wrapping a deferred computation `() => Procedural`-style
   (bare `Msg` | `Promise<Msg>` | `Result`/`proc` output folded to a `Msg`)
   that only the runtime invokes. Export constructors with collision-free
   names (`cmdNone`, `cmdBatch`, `cmdEffect`, plus a `proc`-flavored helper —
   exact spelling is drive's call, but plgg's `none`/`some` must remain
   importable alongside). Module is DOM-free. Document that `effect` is the
   typed custom-effect seam (plgg-fetch HTTP, timers, D12 key minting) so no
   later effect kind needs a plgg-view edit.
2. **`Sub<Msg>` model** (`.../Program/model/Sub.ts`): closed union — `none`,
   `batch`, and keyed leaves: `interval(key, ms, toMsg)`,
   `windowEvent(key, eventName, toMsg: (event: Event) => Option<Msg>)`
   (`none()` = ignore; no preventDefault modeling — deferred, see Related
   History), and `custom(key, start: (dispatch: (msg: Msg) => void) => (() =>
   void))`. Every active leaf carries an explicit stable `key` (the diffing
   identity). Interval/window leaves are pure data — the runtime owns
   `setInterval`/`addEventListener`; `custom` carries the start thunk as
   data. Module is DOM-free.
3. **Effects engine** (`.../Program/usecase/effects.ts` or similar): (a)
   `runCmd(cmd, dispatch)` — flattens `batch` in order, invokes each `effect`
   thunk, dispatches the resulting `Msg` asynchronously, and **drops**
   dispatches that resolve after teardown (alive flag); errors from a
   rejected effect must surface predictably (fold to a `Msg` via the
   constructor's contract or a documented defect path — no silent swallow).
   (b) a subscription manager: given the previous and next flattened keyed
   leaves, start new keys, tear down removed keys, keep surviving keys
   running untouched; `disposeAll` for unmount. Exhaustive `match` over both
   unions.
4. **Break the program types** (`sandbox.ts`, `application.ts`):
   `update: (msg, model) => readonly [Model, Cmd<Msg>]`; `init` follows —
   `Sandbox.init: readonly [Model, Cmd<Msg>]`,
   `Application.init: (url) => readonly [Model, Cmd<Msg>]` (one break, not
   two — see Considerations); add optional
   `subscriptions?: (model: Model) => Sub<Msg>` to both (optional-field
   precedent: `toUrl?`/`historyMode?`). Rewire both dispatch loops:
   update → paint → (application only: reflectUrl) → `runCmd` → re-diff
   subscriptions; run the init `Cmd` and initial subscriptions after first
   paint; extend the returned cleanup to kill the alive flag and dispose all
   subscriptions. Amend the "No `Cmd`, no `Sub`" / "pure-sandbox-compatible
   (no `Cmd`)" doc comments to record the D2 amendment with the spec path.
5. **Export surface**: add `Cmd`/`Sub` types + constructors to
   `src/client.ts` (server-safe: pure data modules, same reason `Application`
   is importable from `server.ts` today). `src/index.ts` remains
   `export * from "plgg-view/Html"` only.
6. **Spec the new machinery** (one spec per module, `plgg-test`, dom
   environment where the runtime is driven): constructor/data shape specs for
   `Cmd.ts`/`Sub.ts` (including: constructing an `effect` never invokes the
   thunk — effects are data); runtime specs for batch execution order,
   post-teardown dispatch dropping, init-`Cmd` execution, subscription
   diffing (new key starts, removed key cleans up, surviving key is NOT
   restarted), `interval` ticking and stopping, `windowEvent` filtering via
   `Option`, and a **fake WebSocket-shaped `custom` sub** (start receives
   `dispatch`, pushes several `Msg`s, cleanup verified) — the D12
   expressibility proof.
7. **Migrate `packages/example`**: `app.ts` `update` returns pairs
   (`cmdNone` on the pure branches); wire the proof-of-value effect — toast
   auto-dismiss: pushing a toast returns a delay `cmdEffect` resolving to
   `ToastDismissed` (today it is manual-only); keep it the *only* behavioral
   addition. Update all 25 `app.spec.ts` assertions to the pair shape (assert
   returned `Cmd`s as data — never executed in specs); `server.ts` SSR entry
   must compile untouched apart from the `init` shape.
8. **Migrate `packages/plggmatic-example`** (`app.ts`, 11 specs) and
   `packages/plgg-view/example.ts` the same way — mechanical `[model,
   cmdNone()]` migration, no new behavior.
9. **Rewrite the prose**: `packages/guide/packages/plgg-view.md` (the
   "no `Cmd`/`Sub`" table row and sections), `packages/plgg-view/README.md`,
   `example.ts` header — describe effects-as-data executed only by the
   runtime; keep the "everything the author writes is pure" claim, which is
   now *more* true, not less.
10. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option not
    null/undefined inside the new modules; exhaustive `match` over the new
    unions; Prettier `printWidth: 50`; zero new dependencies; no diffs under
    `scripts/`.

## Quality Gate

**Acceptance criteria**

1. `Sandbox`/`Application` `update` returns `readonly [Model, Cmd<Msg>]`,
   `init` returns the pair shape, and both accept
   `subscriptions?: (model) => Sub<Msg>`; `Cmd`/`Sub` are closed unions
   consumed with exhaustive `match` — a new variant is a compile error at
   every interpreter site.
2. All scoped primitives exist and are spec'd: `cmd` none/batch/effect
   (from `proc`/Promise-style deferred computations), `sub`
   interval/window-event/custom — and the D12 expressibility proof passes: a
   spec drives a fake WebSocket-shaped `custom` subscription through start,
   multiple dispatches, and cleanup.
3. Effects are data: specs assert that constructing and returning a `Cmd`
   from `update` performs nothing (thunk not invoked), that the runtime
   executes it after paint, and that effects resolving after teardown do not
   dispatch. Subscription diffing preserves continuity (surviving key not
   restarted) and unmount disposes everything.
4. All consumers are migrated in this one branch (roadmap phase-2 gate):
   `packages/example` (with toast auto-dismiss as the runnable `Cmd` demo),
   `packages/plggmatic-example`, `packages/plgg-view/example.ts`, README and
   guide prose. `grep -rn "no \`Cmd\`" packages --include='*.ts'
   --include='*.md'` (excluding node_modules/dist and the unrelated
   plgg-md spec hit) returns no stale runtime claims.
5. SSR unaffected: `packages/plgg-server/src/View/usecase/renderToString.ts`
   and plgg-view's `Html` model/usecase tree have **no diff**; the example's
   SSR entry still renders.
6. No new dependencies in any `package.json`; `git diff --stat` shows no
   changes under `scripts/`.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plgg-view.sh`,
`./scripts/test-example.sh`, `./scripts/test-plggmatic-example.sh` green;
then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not
mask the signature break in downstream consumers) green end to end, with
plgg-view coverage above its configured `plgg-test.config.json` threshold
(89 across statements/branches/functions/lines; the new modules must not be
the reason it hovers there — aim >90 on the new files) and both examples
above theirs. Manually drive one example (`packages/example` dev serve):
push a toast, watch it auto-dismiss — the runnable proof-of-value demo.

**Gate**

All six acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND the toast auto-dismiss demo works in a real browser session. A
single escape hatch, coverage dip below the configured thresholds, stale
"no Cmd" prose, un-migrated consumer, or `scripts/` diff fails the ticket.

## Considerations

- **`init` returning `[Model, Cmd<Msg>]` exceeds D2's literal wording**
  (D2 names only `update`). Proposed as the default because an initial-fetch
  `Cmd` is the most common effect and changing `init` later would be a
  *second* break; if drive keeps `init` pure instead, record that choice in
  the runtime doc comment and this ticket's archive notes.
- **Cancellation is deliberately not shipped** (the research spike's keyed
  `Cmd` idea). Keyed identity ships on the `Sub` side — the part that is
  painful to retrofit; a debounce today is expressible as model-state +
  interval/custom sub. Revisit trigger: the first real debounce consumer
  (plggpress admin search, phase 6).
- **URL reflection stays a runtime concern, not a `Cmd`**: `toUrl`/
  `historyMode` are a *reconciliation* of model→address-bar, diff-gated to
  avoid loops — folding it into `Cmd` would let app code emit raw history
  writes and reopen the loop hazard. Keep the existing comment, updated to
  say why it remains outside `Cmd` now that `Cmd` exists.
- **Not shipped, expressible later via the seams**: `animationend → Msg`
  orchestration (transition tickets), rich event decoding / `preventDefault`
  (research ticket `20260613183141`), DOM-task commands (focus/scroll —
  should reuse the ref/post-paint research, not duplicate DOM access), and
  every Realtime-agent particular (ticket 25 mints keys via `cmdEffect`
  through plgg-kit and owns the real WebSocket/audio `custom` sub).
- **Scheduler dependency**: phase 4 (tickets 09–13) builds action flows on
  this runtime — resist pulling any scheduler vocabulary (menus, actions,
  panes) into plgg-view; this ticket ends at the generic effects seam.
- The standalone-era `qmu/plggmatic` repo is irrelevant here; today's
  `packages/plggmatic` consumes only plgg-view's `Html`/`Style` surface, so
  it compiles unchanged — but the fresh `check-all.sh` is the arbiter, not
  this assumption.

## Final Report

Implemented in commit `c00e29a` (feat, breaking) + this archive commit.

**What Changed**
- New `Program/model/Cmd.ts` (`Cmd<Msg>` = `cmdNone` (`Icon`) / `cmdBatch` /
  `cmdEffect(() => Promise<Msg>)` — the typed custom-effect seam), `Program/
  model/Sub.ts` (`Sub<Msg>` = `subNone`/`subBatch`/`interval`/`windowEvent`
  (`(event)=>Option<Msg>` filter)/`custom` (`start:(dispatch)=>cleanup`), every
  active leaf keyed), `Program/usecase/effects.ts` (`runCmd` — flatten batch,
  invoke effect thunks, dispatch async, no silent swallow; `makeSubRuntime` —
  diff-by-key start/stop/keep-survivor + `disposeAll`; injectable `SubEnv` seam
  `{interval, windowEvent}` with `browserSubEnv` default, mirroring the
  renderer's `Play`).
- **Breaking (D2):** `Sandbox`/`Application` `update: (msg,model) => readonly
  [Model, Cmd<Msg>]`, `init` the pair shape, both accept optional
  `subscriptions?: (model) => Sub<Msg>`. Both dispatch loops rewired
  (update → paint → (application: reflectUrl) → `runCmd` → re-diff subs); init
  `Cmd` + initial subs run after first paint; cleanup flips an `alive` flag and
  `disposeAll`s subscriptions. `client.ts` exports the `Cmd`/`Sub` surface +
  matchers. The "No `Cmd`/`Sub`" doc comments carry the recorded D2 amendment;
  URL reflection is documented as deliberately outside `Cmd`.
- **All consumers migrated in one branch:** `packages/example` gains the
  runnable demo — `pushToast` returns `[model, cmdEffect(dismissAfter)]`, so a
  toast auto-dismisses after 4s (was manual-only); 26 specs (incl. a
  Cmd-as-data assertion). `plggmatic-example` (11 specs) and
  `plgg-view/example.ts` counter migrated mechanically (`[model, cmdNone()]`).
  Prose rewritten: `plgg-view/README.md`, guide `plgg-view.md`/`example.md`,
  `plggmatic-example/main.ts` — no stale "no Cmd" runtime claims remain.
- Specs: one per new module — Cmd/Sub shape (constructing an `effect` invokes
  nothing), `effects` (batch order, post-teardown drop, subscription diffing
  with survivor-not-restarted, interval tick/stop, `windowEvent` Option filter,
  and a **fake WebSocket-shaped `custom` sub** as the D12 proof), plus runtime
  specs on `sandbox`/`application` (init-Cmd after paint, update-Cmd dispatch,
  subscription toggle on/off, alive-guard drop, dispose on cleanup).

**Verification**
- Fresh `scripts/check-all.sh`: **EXIT 0**. plgg-view **145 passed / 0 failed**;
  `Cmd`/`Sub`/`effects` **100%** covered; gate passed (98.70% stmts, **91.51%
  branches**, 95.71% fns, all > 89). `example` 26 passed, `plggmatic-example`
  11 passed; every suite 0 failed.
- **SSR unaffected:** `plgg-server/.../renderToString.ts` and
  `plgg-view/src/Html/**` have **no diff**. No `scripts/` or dependency changes.
- **Real-browser demo (gate):** served `packages/example`, added a todo → toast
  `Added "Auto-dismiss me"` rendered (`toastCount: 1`); after the 4s `cmdEffect`
  the runtime dispatched `ToastDismissed` and removed it (`toastCount: 0`) while
  the todos stayed. Auto-dismiss works end-to-end. No `as`/`any`/`ts-ignore`.

**Discovered Insights**
- **`Cmd` vs `Sub` variance.** `Cmd<Msg>` is covariant (Msg only in output
  positions), so `cmdNone(): Cmd<never>` flows anywhere. `Sub<Msg>` is
  INVARIANT — the `custom` sub's `start:(dispatch:(msg:Msg)=>void)=>…` puts Msg
  in a contravariant slot — so an empty `subBatch([])` or a `none()`-returning
  `windowEvent` needs an explicit `<Msg>` type argument (inference falls back to
  the Box placeholder tag otherwise). Documented at the spec call sites.
- **The `SubEnv` injection seam is what makes the runtime testable** — real
  `setInterval`/`window` would make interval/window specs flaky; the fake env
  fires on `tickAll()`/`emit()`, and a start/cleanup counter proves a survivor
  key is not restarted (total starts, not just current count).
- **The alive-gated dispatch is the single teardown guard.** Placing the
  `if (!alive) return` in the runtime's `dispatch` (not in `runCmd`) makes both
  effect-resolved and subscription-fired dispatches drop after cleanup with one
  check; the effects layer stays free of teardown state.
- Verification discipline held: `N passed, M failed` + the `sh -eu` success
  trailer / exit code from a FOREGROUND `check-all`, plus a real browser drive
  for the effect the tests can only prove structurally.
