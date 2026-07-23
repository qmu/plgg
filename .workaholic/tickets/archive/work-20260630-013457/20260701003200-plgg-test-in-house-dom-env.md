---
created_at: 2026-07-01T00:32:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category: Changed
depends_on:
---

# Build an in-house `dom` test-environment in plgg-test (retire happy-dom internals)

## Overview

`plgg-test` currently provides a browser DOM to opted-in specs by lazily
importing **happy-dom** (`packages/plgg-test/src/Env/dom.ts` → `installHappyDom`,
behind the `// @plgg-test-environment happy-dom` / legacy `// @vitest-environment
happy-dom` directive). The maintainer rejects the happy-dom dependency outright;
the repo's vendor-neutrality posture ("as a rule, implement it ourselves" — the
same posture that shed vite/vitepress and pruned dotenv) says the runner should
own its test-DOM. A second-opinion analysis (Codex) confirmed the DOM dependence
across the whole monorepo is **shallow but broad**: *no* spec needs a real layout
engine (the FLIP test even stubs `getBoundingClientRect` because happy-dom returns
zero rects). So a small, from-scratch DOM owned by plgg-test can replace happy-dom
with **zero new third-party deps**.

This is the **keystone** ticket: build the in-house DOM and prove it via
plgg-test's own self-test. Migrating the consumer specs (plgg-view, example) and
stripping happy-dom from their `package.json` + adding the no-happy-dom gate is
the dependent follow-up ([20260701003201-drop-happy-dom-migrate-consumers.md]).

Lineage (discovery): `U1-dom` (archive/work-20260624-135934/…-u1-dom-environment-seam.md,
commits f29da9c/ffb8811) **created** this happy-dom seam; the dotenv/happy-dom
removal ticket (archive/work-20260628-010653, commit 2d0297a) deliberately
**left** plgg-view/example/plgg-test as the remaining happy-dom users "for later".
This ticket is that later. Moderation: **clear** (todo/ and icebox/ empty).

## Scope (this ticket)

In-house DOM lives entirely inside **plgg-test**. This ticket:

1. Builds the from-scratch DOM under `packages/plgg-test/src/Env/`.
2. Renames the accepted directive token `happy-dom` → vendor-neutral **`dom`**,
   and **retires the legacy `// @vitest-environment` alias** (the new canonical
   directive is `// @plgg-test-environment dom`).
3. Migrates plgg-test's own self-test fixtures + `Runner.spec.ts` onto `dom`.
4. Drops happy-dom from **plgg-test's** `package.json`
   (`peerDependencies` + the whole `peerDependenciesMeta` block + `devDependencies`).

It does **not** touch plgg-view/example specs or their `package.json` — that is
the dependent ticket, so the two can land/approve independently.

## Key Files

- `packages/plgg-test/src/Env/dom.ts` — **the file that owns happy-dom today.**
  Keep its public surface byte-for-byte: `environmentOf(file)`, `RestoreEnv`,
  `installEnvironment(env)`. Replace `installHappyDom` with an in-house builder.
  Update the `DIRECTIVE` regex / accept-set so only `@plgg-test-environment` is
  honored (drop `@vitest`), the `installEnvironment` dispatch arm
  (`environment === "happy-dom"` → `=== "dom"`), and the unknown-token error text.
- `packages/plgg-test/src/Env/` (new modules) — the DOM itself. Suggested split by
  role (matches the per-role `src/` layout: Core/Env/Matchers/Mock/…): a node-graph
  module, an event-dispatch module, a selector module, a window/history/location
  module, and the global install/teardown that today is `installHappyDom`.
- `packages/plgg-test/src/Core/Runner.ts` — calls `installEnvironment(environmentOf
  (file))` **before** the dynamic `import` of the spec (≈ lines 56-58) and
  `await restore()` in `finally` (≈ line 79). **No structural change** — it consumes
  the unchanged dom.ts API. Update the stale `window.happyDOM` comment (≈ line 51).
- `packages/plgg-test/src/Core/Runner.spec.ts` — the self-test: "a … spec gets a
  DOM" (loads `_domFixture`, expects 3 passed / 0 failed → proves install-before-
  import) and the leak test (runs `_domFixture` then `_noDomFixture`, asserts
  `document`/`window`/`self`/`top` are all `in globalThis === false` after teardown).
  Update the token in the test name/comment; both assertions must hold for the
  in-house DOM.
- `packages/plgg-test/fixtures/_domFixture.spec.ts` — rename directive token →
  `dom`; it builds `document.createElement("div")` at **module-eval time** and
  asserts `document.createElement`, `window.document`, `element.getBoundingClientRect`.
- `packages/plgg-test/fixtures/_noDomFixture.spec.ts` — no directive; stays valid;
  the teardown contract must keep `'document' in globalThis === false` green.
- `packages/plgg-test/tsconfig.json` — has **no `lib`** entry (so ES2021 libs only;
  no lib.dom). The shim source can't see `Document`/`HTMLElement`/`Event` types.
  Decide the typing approach (see Considerations) — likely add `"DOM","DOM.Iterable"`
  to `lib` *scoped so it doesn't mask the runner's DOM-free guarantees*, and/or
  self-declare narrow interfaces the shim genuinely implements.
- `packages/plgg-test/package.json` — remove happy-dom from `peerDependencies`,
  delete the `peerDependenciesMeta` block (happy-dom is its only entry), and remove
  it from `devDependencies`. Leaves `dependencies` (plgg + typescript) untouched.
- `packages/plgg-test/bundle.config.ts` — stale header comment lists happy-dom as an
  external; externals are derived from package.json, so only the comment changes.

## Required DOM surface (build only this — no full browser)

The union the specs actually exercise (from source discovery). Build exactly this:

- **Globals installed onto `globalThis`** (own-props, recorded for exact-delete
  teardown): `document`, `window`, `self`, `top`, plus the `instanceof` targets
  `Element`, `HTMLElement`, `CharacterData`, `HTMLInputElement`,
  `HTMLTextAreaElement`, `HTMLLIElement`, plus `DOMRect`, `MouseEvent`,
  `getComputedStyle`. Reuse Node's built-in `Event`/`CustomEvent`/`EventTarget`/
  `MessageEvent`/`CloseEvent` via the FORCE_INSTALL save/restore (see below).
- **document**: `createElement(tag)`, `createTextNode`, `body` (HTMLElement),
  `head`, `activeElement`, `body.innerHTML` setter.
- **Node/ChildNode**: `appendChild`, `removeChild`, `replaceChild`,
  `replaceChildren(...)`, `contains`, `childNodes` (`.length`), `firstChild`,
  `parentElement`.
- **Element/HTMLElement**: `tagName` (uppercased), `firstElementChild`, `children`
  (HTMLCollection: `.length`, indexable, `Array.from`-iterable), `querySelector`,
  `querySelectorAll`, `getAttribute`/`setAttribute`/`hasAttribute`/`removeAttribute`,
  `textContent` (get/set), `classList`, `focus()`, `style` (read/write
  `position`/`boxSizing`/`opacity`/`transform` + general inline style), `animate`
  **absent by default** (so `waapiPlay` no-ops) but `Object.defineProperty`-able
  per-node, `getBoundingClientRect()` → `DOMRect` (deterministic zero-rect default;
  spec-overridable).
- **Text nodes**: must be `instanceof CharacterData` with a **writable `.data`**
  (render.ts deliberately guards on `CharacterData`, not `Text`).
- **CSS selectors** (the non-trivial piece — scope to exactly these shapes):
  tag, `.class`, `[attr=val]`, compound (`input[name=title]`,
  `li.todo input[type=checkbox]`, `.todo-filters button.filter.selected`,
  `style[data-plgg-style]`).
- **Events**: `new Event(type,{bubbles?,cancelable?})` with `.defaultPrevented` +
  `preventDefault()`; `CustomEvent`; `new MouseEvent(type, MouseEventInit
  {bubbles,cancelable,button,metaKey,…})`; `dispatchEvent` on Element **and**
  Window; **bubbling** so an anchor click reaches document-level listeners;
  **`event.target` set to the dispatch target** (handlers read `target.value`/
  `target.checked`). Flows used: `click`,`input`,`change`,`submit`,`popstate`.
- **window**: `EventTarget` methods, `document`, `location {pathname,search,href,
  origin}`, `history.pushState`/`replaceState` (**actually mutate location**;
  configurable so specs can `Object.defineProperty`-spy them), `matchMedia`
  (may be absent — specs stub it), `self`, `top`.
- **Navigation inertness**: a same-origin, un-prevented `<a>` click must **not**
  synchronously navigate (parity with the happy-dom `settings.navigation` knob the
  application.spec disabled). Default-inert; no `window.happyDOM` accessor exists.

## Implementation Steps

1. **Model the node graph class-free** (house rule bans `class`/`this`/`enum`/
   `switch`). Express nodes as `type` + functions; give each node a `kind`/`tag`
   brand. Make `instanceof` work via `Symbol.hasInstance` on plain object
   "constructors" (e.g. `const HTMLInputElement = { [Symbol.hasInstance]: (v) =>
   isElement(v) && v.tagName === "INPUT" }`) — class-free and this-free. Provide the
   `new`-able `MouseEvent`/`DOMRect` as **function factories that return an object**
   (a `function` that explicitly returns is constructable without using `this`).
   Reuse Node's built-in `Event`/`CustomEvent`/`EventTarget` for the rest.
2. **Event dispatch**: implement bubbling + `target`/`currentTarget` + `cancelable`/
   `preventDefault`/`defaultPrevented`. Keep the FORCE_INSTALL override of Node's
   `Event` family (save prior descriptor, restore on teardown) so dispatched events
   carry `.target` — the original reason that list exists.
3. **Selector engine**: minimal matcher covering exactly the selector shapes listed
   above; return `null`/empty for non-matches (don't silently mis-match).
4. **window/history/location**: seed base `http://localhost/` (same-origin path `/`,
   matching happy-dom's prior seed); `pushState`/`replaceState` mutate `location`.
5. **Install/teardown**: mirror the GlobalWindow approach — install only own-prop
   keys **not already on `globalThis`**, record them, FORCE_INSTALL-override the
   event family with save/restore; async teardown **first** aborts any pending
   timers / async work (the `win.happyDOM.close()` replacement) **then** deletes
   exactly the added keys and restores overridden descriptors. No leak into the next
   file.
6. **Directive rename**: update `DIRECTIVE` regex + accept-set (drop `@vitest`),
   `installEnvironment` dispatch + unknown-token error text; migrate
   `_domFixture.spec.ts` and `Runner.spec.ts` token/comments.
7. **Typing**: resolve the lib.dom gap with **no `as`/`any`/`ts-ignore`** (see
   Considerations). Self-declare narrow interfaces the shim truly implements; the
   *consumer* specs already type against lib.dom ambients, so the binding is purely
   runtime — the shim only needs to be runtime-compatible.
8. **Drop happy-dom from plgg-test/package.json**; regenerate plgg-test's lockfile.
9. **Verify**: `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` (at least the
   plgg-test suite incl. Runner self-test + the two fixtures) green; coverage of the
   new `src/Env/` code clears the gate.

## Considerations

- **No-`class` vs a DOM (the central design call).** A DOM is naturally an object
  graph, but the house style forbids `class`/`this`/`enum`/`switch` and the runner
  runs `.ts` directly under Node native type-stripping (`isolatedModules`,
  erasable-syntax-only — no runtime `enum`/`namespace`/parameter-properties). The
  recommended class-free design: `type`+functions for nodes, `Symbol.hasInstance`
  for every element `instanceof`, function-factories for `new MouseEvent`/`new
  DOMRect`, and Node's built-in `Event` family for the rest. This keeps **zero
  escape hatches** — do **not** reach for `class` or `as`/`any` to make `instanceof`
  or `new` work.
- **lib.dom typing without escape hatches** is the single biggest difficulty.
  plgg-test has no `DOM` lib; the shim must be authored against *some* types. Adding
  `"DOM","DOM.Iterable"` to plgg-test's `tsconfig.lib` lets the shim satisfy lib.dom
  interfaces — **but** it also pulls ambient `document`/`window` into the runner
  source, which could mask the runner's own DOM-free guarantees (`_noDomFixture`
  checks `'document' in globalThis`). Prefer self-declared **narrow** interfaces the
  shim genuinely `implements`, scoping any lib addition so it can't weaken the
  runner. `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` are
  all on — full lib.dom interfaces have hundreds of members; implement only the
  narrowed surface above.
- **Single realm for `instanceof`.** The constructors installed as globals must be
  the exact ones the created nodes are instances of (render.ts guards on
  `CharacterData`/`Element`; specs on `HTMLInputElement`/`…`). A wrapper/second
  realm silently breaks these guards (renderer falls back to `replace()`).
- **`event.target` on dispatch** (FORCE_INSTALL reason): top defect risk — handlers
  read `target.value`/`target.checked`; get bubbling + target/currentTarget right.
- **Async teardown / no late-task crash**: track and cancel pending timers/async
  before detaching globals, else a late task throws against a torn-down document and
  reds the *next* file. The leak test asserts `document`/`window`/`self`/`top` all
  gone post-teardown — install `window`/`self`/`top` as own-props and delete exactly
  them.
- **Coverage**: the new `src/Env/` code counts toward the gate (it is **not** in
  plgg-test.config.json's coverage `exclude`). Project policy is >90% across
  statements/branches/functions/lines; plgg-test documents a deliberate per-package
  **85 branch** floor for defensive arms — don't widen that gap; keep the DOM's
  branches exercisable from the Runner self-test + fixtures. (Real >90 proof comes
  when the consumer specs run in the dependent ticket.)
- **Don't clone garbage**: build clean from first principles in plgg vocabulary; do
  not transliterate happy-dom's internals.
- **Tooling**: typecheck via `scripts/tsc-plgg.sh`, test via `scripts/test-plgg.sh`
  (no bespoke per-package scripts). Prettier `printWidth: 50` — write narrow.

## Policies

- `workaholic:implementation` / `policies/vendor-neutrality.md` — **headline**:
  implement it ourselves; remove the external dep with **zero** replacement deps.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/
  `ts-ignore` (CLAUDE.md top rule), no `class`/`this`/`enum`/`switch`/`null`; model
  the node graph as `type` + functions; Option/Result; exhaustive `match`.
- `workaholic:implementation` / `policies/directory-structure.md` — DOM lives under
  plgg-test `src/Env/`; pronounceable role-named modules; the `dom` token follows
  one-role-one-name.
- `workaholic:implementation` / `policies/test.md` — exercise the real in-house DOM
  (Runner self-test + fixtures); target boundaries (event `.target`, no-leak
  teardown, unknown-token hard error).
