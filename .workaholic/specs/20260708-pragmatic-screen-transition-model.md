# Pragmatic — screen-transition model (AI-generatable + AI-operable)

**Status:** Specification (2026-07-08). One half of the near-term specification work derived from the Pragmatic concept ([`20260708-pragmatic-ai-native-ui-concept.md`](20260708-pragmatic-ai-native-ui-concept.md)). The sibling half is the input-field model ([`20260708-pragmatic-input-field-model.md`](20260708-pragmatic-input-field-model.md)), which **reuses the shared property set defined in §5 of this document** — the two specs compose into one model, they do not fork it.

> **Naming.** *Pragmatic* is the concept/product name; `plggmatic` is the package that embodies it. This document describes the **screen-transition** mechanism: how the screen a user (or an operating agent) sees next arises from the data and the situation, not from a hand-authored navigation graph.

**How to read the evidence.** Every claim about *current, shipped behavior* cites the code by `path:line`. Every property that is **not** yet realized in the code is tagged **Proposed** (a target the model asks for) or **Partial** (present but incomplete). Unqualified prose describes the current samples (per `workaholic:implementation` / `objective-documentation.md`).

The two grounding samples are:

- **The plggmatic scheduler** — the `declare → schedule → render` TEA runtime (`packages/plggmatic/src/{Declare,Schedule,Render}/`), whose `Scene` has menu/list/detail levels and whose whole navigable state lives in the URL.
- **Demo 1** — the business app (`packages/plggmatic-example/src/demo1/`) whose per-section `search → results → detail` flow is deep-linkable and whose view stages are a typed discriminated union.

---

## 1. Vocabulary (fixed terms)

One word per concept, used identically here, in the code, and in the sibling spec. These extend the scheduler design record ([`20260704-plggmatic-scheduler-design.md`](20260704-plggmatic-scheduler-design.md) §0).

- **Situation** — an event that can change what is shown: a `SchedulerMsg` variant (`packages/plggmatic/src/Schedule/model/Msg.ts:33`).
- **State** — the mode-independent truth a transition acts on: the scheduled `Model` (`packages/plggmatic/src/Schedule/model/Model.ts:86`), reflected in the URL.
- **Transition** — the pure function `(situation, state) → [state, effect]`: the derived `update` (`packages/plggmatic/src/Schedule/usecase/update.ts:224`).
- **Level** — a position (depth) in the drill-down flow, not a column/screen: the `Level` union (`packages/plggmatic/src/Schedule/model/Scene.ts:68`). A *level* is depth; a renderer projects levels into columns or a single screen.
- **Scene** — the presentation-neutral projection of the state a renderer draws: `Scene` (`packages/plggmatic/src/Schedule/model/Scene.ts:106`), derived by `makeScene` (`packages/plggmatic/src/Schedule/usecase/scene.ts:265`).
- **Address** — the URL slice `{root, path, query}` that *is* the shareable identity of a screen: `UrlSlice` (`packages/plggmatic/src/Schedule/usecase/codec.ts:22`).

---

## 2. The current model, factually (with evidence)

### 2.1 State is mode-independent and lives in the URL

The scheduled `Model` carries **only** navigable truth — the mount `base`, the chosen `root` collection, the drill-down `path` of selected row ids (root→leaf), the active `query` text, the per-collection load `slots`, and any `pending` confirmation (`Schedule/model/Model.ts:86-95`). "Which single screen is focused" is **derived** from `path.length`, never stored (`Model.ts:79-84`). No column, pane, drawer, or screen ever enters the model (design tenet g, `20260704-plggmatic-scheduler-design.md` §6).

The URL-reflected part of the state is exactly the `{root, path, query}` slice (`UrlSlice`, `codec.ts:22-26`). `parseUrl` folds any string into a valid slice and **never throws** — a URL is user input (`codec.ts:35-54`); `toUrl` serializes the slice back (`codec.ts:97-105`); the two round-trip. This makes every arrangement of the flow a shareable, deep-linkable **address**.

### 2.2 Situations are a closed set

Everything that can move the flow is one of nine `SchedulerMsg` variants (`Schedule/model/Msg.ts:33-64`):

- `UrlChanged` — a navigation (link/back/forward) the runtime turned into a message.
- `OpenMenu` — a menu entry chose a root collection.
- `Select { level, id }` — a row was selected at a flow level (drills to the next level).
- `QueryInput` — the active list's query text changed.
- `RequestAction { collection, action, target }` — an action was requested.
- `ConfirmAction` / `CancelAction` — resolve a parked destructive confirmation.
- `Loaded` / `Failed` — an async collection read (or an action's re-read) resolved.

The union is closed, so the transition's `match` is exhaustive: a new interaction cannot be added without every interpreter site acknowledging it (`Msg.ts:14-19`, enforced by `tsc`).

### 2.3 The transition is a pure `(situation, state) → [state, effect]` fold

`makeUpdate` (`Schedule/usecase/update.ts:224-326`) exhaustively matches the situation and returns a `[Model, Cmd]` pair. It touches no `window`/`document` and executes no effect — async reads and action verbs are **returned as `Cmd` data** (`update.ts:216-223`, design tenet b). The navigation situations (`UrlChanged`, `OpenMenu`, `Select`) all set the `{root, path, query}` slice and then re-read the revealed chain via `ensureChain`:

- `UrlChanged` re-parses the slice from the URL and re-reads (`update.ts:229-240`).
- `OpenMenu` sets `root`, clears `path`/`query`, re-reads (`update.ts:242-251`).
- `Select` appends the selected id at its level (truncating deeper selections via `ancestorPath`) and re-reads (`update.ts:253-267`).

`ensureChain` reads every collection revealed by the current `root`/`path` — the chain up to the deepest selected level — folding each read into the model and batching its `Cmd` (`update.ts:124-156`). Reading fresh on every navigation is what keeps a child list correct when its parent selection changes, with no slot-invalidation dance (`update.ts:115-123`).

### 2.4 The flow graph is not authored — it is the declaration's structure

There is no hand-written navigation graph. The reachable flow is **computed** from the declaration by following each collection's `child` pointer: `chainCollections` returns `[root, child, grandchild, …]` and is total — a `None` root or a dangling child id ends the chain rather than throwing (`Schedule/usecase/chain.ts:11-49`). The set of screens is therefore the menu roots × the child-chains they open — a space *generated by the vocabulary*, not enumerated by an author.

### 2.5 The Scene is derived, not stored

`makeScene` (`scene.ts:265-333`) projects the state into a `Scene`: a `MenuLevel`, then a `ListLevel` per revealed flow depth, then a `DetailLevel` when the deepest childless selection shows an item, plus any pending confirmation. The `Level` union is closed (`Scene.ts:68-98`), so a renderer folds it with an exhaustive `match` — a new level kind is a compile error at every renderer. Two renderers (`multiColumn`, `singleColumn`) consume the *same* scene; the dispatcher `renderMode` matches the closed `Mode` (`Render/usecase/renderMode.ts:19-28`), and because both are pure projections of one scene, a mode flip mid-flow is loss-free by construction (`renderMode.ts:8-18`).

Each level carries the declared semantics a transition needs to be legible: list rows carry their drill `href` and `active` flag (`scene.ts:174-181`), `back` links are truncating URLs (`scene.ts:156-160`, `codec.ts:116-119` `hrefFor`), and action buttons carry `verb`/`destructive` (`scene.ts:89-97`). Leaving a level is a **link** (a truncating address), not a mode switch (`codec.ts:107-115`).

### 2.6 Four interactive states are part of a transition, not an afterthought

A collection's load is a closed `Slot` union — `Idle`, `Loading`, `Loaded(rows)`, `Failed(msg)` (`Model.ts:24-28`) — and the scene reads it into `{rows, loading, error}` (`scene.ts:53-87`). Mapping to `workaholic:design` / `interaction-design-standard.md`'s four states:

| Interactive state | Where it lives now |
| --- | --- |
| loading | `Slot.Loading` → `ListLevel.loading: true` (`scene.ts:64-70`) |
| empty | `Slot.Loaded([])` → `ListLevel.rows: []` (`scene.ts:71-78`) — *distinct from loading, but not separately labelled; see §7* |
| error | `Slot.Failed` → `ListLevel.error: Some` (`scene.ts:79-86`) |
| success | `Slot.Loaded(rows)` → `ListLevel.rows` (`scene.ts:71-78`) |

Every transition into a list therefore carries its own load/empty/error/success state as data — the renderer never invents it.

### 2.7 Demo 1 — a worked transition instance

Demo 1 layers an app-owned overlay on the scheduler's base address and expresses its whole view as a **typed discriminated union of stages** rather than reading raw params outside one module. `AppLayer` (`packages/plggmatic-example/src/demo1/url.ts:63-74`) is `menu | add | searchOpen | searchSubmitted`; `printAppLayer` prints a stage onto the base URL and `appLayerOf` collapses the model's flags into the single stage the URL can hold (`url.ts:134-167`, `url.ts:209-223`). The scheduler owns `c` (section) and `p` (selection); the app confines every raw param key to this one cluster and speaks in typed stages everywhere else (`url.ts:52-57`). This is a concrete instance of *situation × data → the next screen, addressably*: the stage is a pure function of the model, and the model is reconstructable from the URL (`searchFormFromUrl`, `url.ts:117-127`).

---

## 3. "Probabilistic by structure" — precise definition

The concept calls transitions "structurally probabilistic" ([concept](20260708-pragmatic-ai-native-ui-concept.md) §"Why probabilistic by structure"). Made precise against the samples:

> A transition is **probabilistic by structure** when the next screen is *computed from `(data × situation)` inside a space bounded by the vocabulary*, rather than selected from a fixed, hand-authored set of routes.

Two things must both hold, and both are observable in the scheduler today:

1. **Determined by data × situation, not by an authored route.** The next `Scene` is `makeScene(update(situation, state))` — a pure composition (`update.ts:224`, `scene.ts:265`). The reachable levels come from `chainCollections` walking the declaration's `child` pointers (`chain.ts:11`), not from an author enumerating screens. Change the data (a collection gains a `child`, or a source returns different rows) and the reachable transitions change with no route edits. This is the sense in which the flow is "probabilistic": it is *induced by structure*, so a generating agent can produce a valid transition it never saw authored.

2. **Bounded so every producible transition is well-formed.** The space is constrained by closed unions at every seam — `SchedulerMsg` (`Msg.ts:33`), `Slot` (`Model.ts:24`), `Level` (`Scene.ts:68`), `Confirm` (`Declare/model/Action.ts:30`), `Source` (`Declare/model/Source.ts:40`), `Mode` (`Render/model/mode.ts:9`). A transition is well-formed **by construction**: `parseUrl` cannot yield an invalid slice (`codec.ts:35`), `chainCollections` cannot throw on a dangling id (`chain.ts:11`), and `Select` cannot leave a deeper stale selection because it truncates via `ancestorPath` (`update.ts:253-267`). "Coherent by construction rather than by luck" ([concept](20260708-pragmatic-ai-native-ui-concept.md) §"Why probabilistic by structure") is exactly these totality + closed-union guarantees.

**What makes the space coherent (enumerated):**

- Every screen is an **address** (`{root, path, query}`), and every address round-trips (`codec.ts` `parseUrl`/`toUrl`) — so no screen is unreachable or unshareable.
- Every drill/leave is a **link** to another address, never a mode (`hrefFor`, `codec.ts:116`) — so navigation is composable and back/forward-safe (`historyMode`, `schedule.ts:81-84`).
- Every list carries its **four interactive states** as data (§2.6) — so a produced transition is never in an undefined display state.
- Every action's **intent** is data — `verb` + `Confirm` (`Action.ts:20-49`) — so a destructive transition is explicit, not folklore.

---

## 4. Situation → screen: the rule a generating agent applies

The concept's mechanism is: *an AI that knows the data structures and the update procedures can generate the screen the situation calls for* ([concept](20260708-pragmatic-ai-native-ui-concept.md) §"The mechanism"). For transitions, the rule the current model encodes is:

Given **(a)** the declaration's collections (their `toRow` projection, `child` links, `query`, and `actions`) and **(b)** the current situation, the next screen is:

1. Fold the situation into the state slice — navigation situations set `{root, path, query}` (`update.ts:229-267`).
2. Compute the revealed chain from `root` by following `child` (`chain.ts:11`).
3. For each revealed depth ≤ `path.length`, read its collection's source against its ancestor `path` (`update.ts:124-156`, `ancestorPath` `chain.ts:51`).
4. Project the result into a `Scene`: menu → one list per depth → a detail if the deepest selection is childless (`scene.ts:265-333`).

A generating agent produces a *correct* transition by choosing a well-typed situation and a declaration whose collections carry the right `toRow`/`child`/`actions`; the four steps above then yield a coherent screen with no further authoring.

---

## 5. Shared property set — AI-generatable and AI-operable

> **This section defines the shared property set the sibling input-field spec reuses.** It states, for *any* Pragmatic unit (a transition here, an input there), what "AI-generatable" and "AI-operable" concretely require. The two specs instantiate this same set; they do not define competing ones.

A Pragmatic unit `U` (a transition, an input, later a whole screen) is:

**AI-generatable** when a generating agent can produce a correct `U` from the domain alone, because:

- **G1 — Vocabulary-closed.** `U` is assembled from a closed, typed vocabulary, so every producible `U` is well-formed and an out-of-vocabulary `U` fails to type-check (not at runtime). *Evidence for transitions: the closed unions in §3.2.*
- **G2 — Data-derived.** `U` is a pure function of the domain data + the update procedures the agent already understands — no hidden authored artifact is required. *Evidence: `makeScene ∘ update`, §4.*
- **G3 — Totality.** Producing `U` from any well-typed input never throws or yields an undefined state — malformed input degrades to a valid smaller `U`. *Evidence: `parseUrl`/`chainCollections` totality, §3.2.*

**AI-operable** when an operating agent (including a *different*, browser-side WebMCP agent) can read the produced `U` and drive it deterministically, because:

- **O1 — Stable identity.** Every operable element of `U` exposes a stable, machine-readable identifier that survives re-render. *Transitions: the address `{root, path, query}` and each level's `collection` id (`Scene.ts`), which are byte-stable per state (`codec.ts` canonical serialization).*
- **O2 — Enumerated affordances.** The actions available on `U` are enumerated as data with their intent, not implied by prose. *Transitions: `ActionButton { id, label, verb, destructive }` and level `href`s (`Scene.ts:27-32`, `scene.ts:89-97`).*
- **O3 — Legible state.** `U`'s current state — including loading/empty/error/success — is readable from its structure without executing it. *Transitions: `Slot` → `ListLevel {loading, error, rows}` (§2.6).*
- **O4 — Deterministic drive.** Acting on an affordance produces a predictable next state the agent can verify. *Transitions: a link navigates to a known address; `update` is pure and re-derivable (§2.3).*
- **O5 — Human-observable & interruptible (A2A).** An agent-driven step is visible to and interruptible by the user; state is never hidden from the human while the agent acts (`workaholic:planning` / `ai-native-future.md`). *Transitions: because all state is in the URL/`Model` and nothing is agent-private, a human sees exactly what the agent sees and can navigate away at any point.*

The remaining sections apply this set to transitions; the input spec applies the identical set to inputs.

---

## 6. AI-generatable properties (transition scope)

Instantiating G1–G3 for screen transitions, with current status:

| Property | Requirement | Status |
| --- | --- | --- |
| Closed situation set | The agent picks a situation from a closed union | **Present** — `SchedulerMsg` (`Msg.ts:33`) |
| Declaration-derived flow | Reachable screens follow from `child` links, not authored routes | **Present** — `chainCollections` (`chain.ts:11`) |
| Total address codec | Any produced address parses to a valid state | **Present** — `parseUrl` (`codec.ts:35`) |
| Coherent projection | The state always projects to a well-formed `Scene` | **Present** — `makeScene` exhaustive (`scene.ts:265`) |
| Declarative transition source | A transition is expressible as *data* an agent emits (not imperative code) | **Partial** — the *scheduler* is declarative, but `Action.run` is an opaque `Cmd` factory (`Action.ts:67-75`); a fully data-level transition description is **Proposed** for the DSL |
| Machine-readable declaration schema | The declaration vocabulary is published as a schema an agent generates against | **Proposed** — the types exist; a schema/DSL surface an agent targets does not yet (see §8) |

---

## 7. AI-operable properties (transition scope, incl. WebMCP)

Instantiating O1–O5 for screen transitions, with current status:

| Property | Requirement | Status |
| --- | --- | --- |
| Addressable identity (O1) | Each screen has a stable, shareable id | **Present** — canonical `{root, path, query}` URL (`codec.ts`) |
| Enumerated navigation affordances (O2) | Each drill/leave is an explicit, labelled link | **Present** — level `href`/`back`/`active` (`scene.ts:156-181`) |
| Enumerated action affordances (O2) | Each action carries id + intent | **Present** — `ActionButton {id, verb, destructive}` (`Scene.ts:27-32`) |
| Legible load state (O3) | loading/error/success readable from structure | **Present** — `ListLevel {loading, error, rows}` (§2.6) |
| Distinct empty state (O3) | "empty" is distinguishable from "loading" *and labelled* for an operator | **Partial** — empty (`rows: []`) is distinct from loading in data, but not a separately labelled state; an explicit empty affordance is **Proposed** |
| Deterministic drive (O4) | Acting yields a predictable, verifiable next address | **Present** — pure `update`; link → known address (§2.3) |
| Human observability (O5) | The user sees the agent's every step | **Present** — all state in the URL/`Model`; nothing agent-private |
| WebMCP-legible surface | The rendered DOM exposes the scene's ids/affordances/state to a browser agent (roles, names, stable selectors) | **Proposed** — the `Scene` *carries* the semantics (ids, labels, active/destructive, back links); whether the emitted HTML surfaces them as WebMCP-consumable structure is **not yet specified** and is the load-bearing open question for browser operability (see §8) |

**On O5 / A2A specifically:** because a transition holds *no* state the human cannot see (everything is the URL address plus the derived scene), an operating agent cannot advance the flow to a place the user cannot observe or reverse. The back/forward semantics (`historyMode`, `schedule.ts:81-84`) mean every agent step is a normal history entry the human can undo. This is the current model's strongest AI-native property and should be preserved by any DSL.

---

## 8. Open questions handed to the DSL

These are the transition-scope items the concept's open-questions list ([concept](20260708-pragmatic-ai-native-ui-concept.md) §"Open questions") leaves for the `/trip` on the plggmatic extraction ([`20260708195655`](../tickets/todo/a-qmu-jp/20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md)) and the DSL distillation:

1. **WebMCP surface (highest priority).** What must the *emitted HTML* expose (ARIA roles/names, stable selectors, or a WebMCP manifest) so a browser agent can read the scene's ids/affordances/state and drive a transition — turning the O1–O4 properties, which the `Scene` already carries as data, into a browser-operable surface. §7's last row is the gap.
2. **Data-level transition description.** `Action.run` is an opaque `Cmd` factory today (`Action.ts:67`); the DSL needs a *declarative* description of a mutation-driven transition so a generating agent can emit the transition as data, not code (§6 last two rows).
3. **Beyond single-parent trees.** The flow is a single-parent drill-down tree (`chain.ts`); cross-links / a level reachable from two parents are unexpressed (design record §10). A probabilistic model over a richer graph is a DSL question.
4. **Explicit empty/first-run affordances.** Empty is data-distinct but unlabelled (§7); a self-explanatory empty transition (`workaholic:design` / `self-explanatory-ui.md`) is a target property.
5. **How much of `declare → schedule → render` is already the DSL.** The vocabulary is a proto-DSL; the `/trip` decides what is generic plgg-family engine vs Pragmatic identity, *with this transition model as one input* — this spec cross-references, it does not pre-decide the boundary.

---

## 9. Cross-references

- Concept: [`20260708-pragmatic-ai-native-ui-concept.md`](20260708-pragmatic-ai-native-ui-concept.md)
- Scheduler design record: [`20260704-plggmatic-scheduler-design.md`](20260704-plggmatic-scheduler-design.md)
- Sibling (input half, reuses §5): [`20260708-pragmatic-input-field-model.md`](20260708-pragmatic-input-field-model.md)
- Feeds the `/trip` on ticket [`20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md`](../tickets/todo/a-qmu-jp/20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md)
