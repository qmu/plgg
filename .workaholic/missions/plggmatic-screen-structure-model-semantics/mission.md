---
type: Mission
title: plggmatic screen-structure model semantics
slug: plggmatic-screen-structure-model-semantics
status: active
created_at: 2026-07-09T11:55:55+09:00
author: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# plggmatic screen-structure model semantics

## Goal

plggmatic is being repositioned (and extracted toward its own repository) as a
**UI design system generatable by an LLM through a condensed semantic DSL**,
whose user interface is **WebMCP-native**: at every settled scene, a browser
agent can discover the currently-legal operations as MCP tools, and the tool
surface changes incrementally as the user (or agent) drills through the UI.
The same DSL that declares the UI schema must also be expressive enough to
*manipulate* the generated UI — a whole flow ("open Clients → choose Search →
set conditions → read results") written as one condensed script, executed by
an embedded runtime.

Before any of that can be specified, the **semantics of the model that
defines screen structure** must be settled: what the declaration vocabulary
can express, what its runtime state means, and where the vocabulary must grow.
This mission records those design discussions and their decisions, and tracks
the tickets that realize them.

### Where the design stands (discussion of 2026-07-09)

The current engine (`packages/plgg-ui/src/Declare` + `Schedule`, re-exported
by the `plggmatic` facade) is a three-tier structure, one pure function
connecting each tier to the next:

1. **`Declaration` — the data model as static vocabulary.**
   `Declaration { title, menu, collections }`; `MenuEntry` names root
   collections; each `Collection { id, title, source, child, query, actions }`
   points to at most one `child`, so the navigable structure is a *forest of
   linear drill chains* — the flow graph is implicit, there is no screen or
   route type. `Row { id, label, fields }` is the erasure seam: a typed `T`
   never survives past the collection's `toRow`. `Source` is a three-variant
   seam (`Sync` / `Async` / `Dynamic`); sources read against a `Path` of
   ancestor selection ids. `Action { id, label, verb, confirm, run }` carries
   closed `Verb` (`create|update|delete`) and `Confirm`
   (`Immediate | Confirm{prompt, destructive}`) semantics as data.

2. **`Model` + `SchedulerMsg` — the user's behavior.**
   The whole session is six fields:
   `{ base, root, path, query, slots, pending }` — ids only, never domain
   objects, never derived facts ("which screen is focused" = `path.length`).
   Load state is a closed `Slot` union (`Idle|Loading|Loaded|Failed`).
   Everything a user can do is the closed `SchedulerMsg` union (`OpenMenu`,
   `Select{level,id}`, `QueryInput`, `RequestAction`, `Confirm/CancelAction`,
   `UrlChanged`, `Loaded/Failed`). `schedule(declaration)` derives a pure TEA
   program; effects return as `Cmd` data. A session is a fold over a Msg
   list; the Model↔URL codec is total both ways, so every reachable state is
   a shareable address.

3. **`Scene` — the observed behavior.**
   `scene: Model → Scene { title, levels, confirm }` with
   `Level = MenuLevel | ListLevel | DetailLevel`; a Level is *depth*, not a
   column or screen (mode-agnostic, D10). Renderers are folds over this
   closed union.

Key conclusions reached so far:

- **The automation vocabulary already exists**: the example flow maps 1:1
  onto `SchedulerMsg`. A DSL script is forms evaluating to Msgs interleaved
  with reads of the settled Scene — no new automation model is needed.
- **WebMCP is a third renderer**: the tool manifest is a fold over `Scene`
  (legal Msgs → tools, input schemas derived from the Declaration), diffed
  and re-registered per model change, so the MCP surface can never drift
  from the visible UI. One meta-tool (`run_flow`) accepts DSL text for
  coarse-grained agent operation.
- **The DSL should be an EDN/Clojure-shaped Lisp with plgg's discipline**:
  no nil (Option/Result literals in the core), no exceptions, exhaustive
  `match`, no ambient I/O (capability-based effects), fuel-metered total
  evaluation, no user macros in v1. Reader built on `plgg-parser`;
  single-digit-KB embeddable runtime is realistic.
- **Recommended execution semantics**: a pausable small-step interpreter
  that yields effects to the scheduler (TEA-native); a paused script is a
  serializable value. To be prototyped first.
- **The serialization gap is exactly four function-valued leaves**
  (`Source.Sync`, `Source.Async`, `Action.run`, `toRow`); everything else in
  the system is inert data. The DSL names capabilities the host binds;
  `toRow` becomes a keyword-projection map in the common case.
- **Known expressiveness limits** of the current vocabulary (the pressure
  points an LLM-generated CMS will hit first): (1) linear drill only —
  `child` is a single optional pointer, no branching or cross-links;
  (2) no form/payload model — `Action.run` takes only an optional target id;
  (3) flat presentation — `Field` is label/value strings, no typed fields or
  widgets; (4) fixed query semantics — one substring predicate over
  `Row.label`. Each is an extension to `Declaration`, not the scheduler.

### What needs to be discussed

The open design questions this mission exists to settle, roughly in order:

1. **Flow-graph expressiveness** — should `child` grow into branching
   children / cross-chain links, and what do `Path`, the URL codec, and
   `Select{level,id}` mean once the drill graph is no longer linear?
2. **Form/payload semantics** — a declarative input model for actions
   (create/update payloads) that stays data, keeps `update` pure, and folds
   into Scene/WebMCP tool schemas the same way rows do.
3. **Typed fields / richer `Row`** — whether `Field` grows a closed value
   union (text, number, date, reference, media…) and what renderers and
   tool schemas derive from it.
4. **Query semantics** — whether Query stays one substring predicate or
   becomes a declared, serializable predicate language (and its relation to
   the DSL).
5. **Scene/Level semantics beyond drill depth** — does the mode-agnostic
   Level stack suffice for the screen structures a design system must
   express (dashboards, side-by-side comparisons, wizards), or does the
   projection vocabulary need new closed variants?
6. **DSL v1 core freeze** — special forms, literals (Option/Result), host
   function set (~30), reader grammar on plgg-parser, fuel semantics.
7. **Capability-binding contract** — how the host names and binds the four
   function seams (`(source :db/clients)`-style references), including the
   keyword-projection shorthand for `toRow`.
8. **WebMCP adapter boundary** — engine-owned `Tool` type with thin
   adapters to `navigator.modelContext` (moving proposal) and to plain MCP
   over HTTP (reusing `plgg-mcp`), so non-browser agents get the identical
   surface.
9. **Execution-model prototype** — prove the pausable small-step
   interpreter ↔ settle-loop handshake (dispatch Msg → settle → resume with
   Scene) before freezing flow semantics.

## Scope

**In scope:** design discussions and decisions on the declaration/model/scene
semantics listed above; DSL language specification (v1 core); the WebMCP
tool-manifest projection design; prototype tickets that validate the
execution model; extensions to `Declaration` (flow graph, forms, typed
fields, query) driven by those decisions.

**Out of scope:** the plggpress → plgg-cms package spread and the plggmatic
repository extraction mechanics (handled by the `plggmatic-extraction-cut`
trip and its tickets); production hardening of any WebMCP browser API
integration while the proposal is still moving; visual theme/design-token
work in `plgg-ui/Style`.

**Done when:** each numbered discussion point above has a recorded decision
(in this mission's changelog and/or a design ticket), and the acceptance
checklist below is fully checked.

## Acceptance

- [ ] Flow-graph expressiveness decision recorded — branching children /
      cross-links, and the resulting `Path`/URL/`Select` semantics (ticket TBD)
- [ ] Form/payload semantics for actions designed as declaration data (ticket TBD)
- [ ] Typed-field / `Row` enrichment decision recorded (ticket TBD)
- [ ] Query-semantics decision recorded — fixed predicate vs declared
      predicate language (ticket TBD)
- [ ] Scene/Level vocabulary reviewed against target screen structures;
      extension decision recorded (ticket TBD)
- [ ] DSL v1 core specification frozen — forms, literals, host functions,
      reader grammar, fuel semantics (ticket TBD)
- [ ] Capability-binding contract specified for the four function seams (ticket TBD)
- [ ] WebMCP adapter boundary designed — engine `Tool` type + WebMCP/MCP
      adapters (ticket TBD)
- [ ] Pausable-interpreter ↔ settle-loop handshake proven by a runnable
      prototype (ticket TBD)

## Changelog

- 2026-07-09 — Mission created from the plggmatic DSL/WebMCP design
  discussion: current three-tier model (Declaration/Model+Msg/Scene)
  documented, key conclusions recorded (Msgs as automation vocabulary,
  WebMCP as a third renderer, EDN-shaped fuel-metered Lisp, four function
  seams as the serialization gap), and the nine open discussion points
  registered.
