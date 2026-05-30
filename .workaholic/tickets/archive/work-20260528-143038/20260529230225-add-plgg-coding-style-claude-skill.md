---
created_at: 2026-05-29T23:02:25+09:00
author: a@qmu.jp
type: enhancement
layer: [Config]
effort: 1h
commit_hash: bbef650
category: Added
depends_on:
---

# Add a project-local Claude Code skill capturing plgg's coding style

## Overview

Create the repository's first project-local Claude Code skill —
`.claude/skills/plgg-coding-style/` — that distills "the plgg way" of writing
code so any agent editing TypeScript in this repo follows the house style by
default. The conventions are visible everywhere in the codebase but live only
implicitly (in the code itself, in CLAUDE.md's one-line rule, and scattered
across ticket Final Reports); this skill consolidates them into a single,
trigger-activated reference.

The user's framing: *"follow the way you see in this repo like defining types,
less statements, less block scope…etc."* The skill encodes exactly that —
type-driven design, expression-style (few statements, little block scope),
data-last pipelines, `Option` not null, `Result` not throw, and the absolute
`as`/`any`/`@ts-ignore` prohibition.

### Positioning (not a fork of existing standards)

This skill is a **concrete distillation**, not a competing policy. It must:
- **Reinforce** CLAUDE.md's hard rule (`as`/`any`/`@ts-ignore` strictly
  prohibited) and the `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh` verify loop.
- **Link to**, and stay consistent with, `standards:leading-validity` (the
  authoritative lens for type-driven design, functional style, Minimum Test
  Harness, Ubiquitous Language) and the `.workaholic/` constraint docs — without
  restating repo-structure rules (dependency direction, export convention, the
  eleven-category taxonomy), which belong to those docs, not a coding-style skill.
- Use real plgg vocabulary (`Result`/`Ok`/`Err`, `Option`, `pipe`/`cast`/`proc`/
  `flow`, `match`/`matchOption`/`matchResult`, `Box`, `Brand`) so it honors the
  Ubiquitous Language convention it teaches.

## Key Files

- `.claude/skills/plgg-coding-style/SKILL.md` — **new**. The main artifact.
  - YAML frontmatter: `name: plgg-coding-style` and a **trigger-phrased**
    `description` that fires whenever an agent is about to write/edit TypeScript
    under `packages/`. e.g.: *"House coding style for the plgg monorepo. Use when
    writing or editing any TypeScript under `packages/` (plgg, plgg-server,
    plgg-router, plgg-view, plgg-fetch, plgg-sql, example): type-driven design,
    expression-style data-last pipelines (pipe/cast/proc/flow), Option not null,
    Result not throw, exhaustive match, and the strict no-`as`/`any`/`ts-ignore`
    rule."*
  - Body (concise, scannable, progressive disclosure): a top **Hard Rules** block,
    then idiom sections each with ONE tiny before/after snippet, then a short
    **Testing** and **See also / authority** section.
- `.claude/skills/plgg-coding-style/reference.md` — **new (optional but
  recommended)**. The longer idiom catalog (full before/after examples,
  file:line exemplars) loaded on demand, so `SKILL.md` stays within a tight
  progressive-disclosure budget.
- No change needed to `CLAUDE.md` (it already references `scripts/…` after the
  rename) — but the skill should cross-link it. Do NOT duplicate the constraint
  docs; link them.

> Note: a `SKILL.md` is **source/config, not a `.workaholic/` doc** — kebab-case
> dir, no `_ja.md` translation, no `commit_hash`/`category` frontmatter (those
> conventions apply only under `.workaholic/`). It lives in `.claude/skills/` and
> is committed (like `.claude/settings.json`) so every contributor/agent gets it.

## Conventions the skill must encode (distilled from the codebase)

Each as a short rule + one before/after snippet. Pull exemplars from the files
listed under "Exemplars".

1. **Type-first triad** — define `type X = …` first, then a constructor, then an
   `asX` caster (`Result<X, InvalidError>`). Values are built/decoded through
   named functions, never ad-hoc literals at call sites. (Required for types
   crossing a boundary — DB/HTTP/JSON; internal helper aliases like
   `type Captured = Dict<…>` may skip the caster.)
2. **`Box` tagged unions** for sum/variant and nominal-scalar types
   (`Box<TAG, CONTENT>`, `__tag`+`content`), one constructor per variant, a
   `$`-suffixed matcher (`notFound$`) where folded by `match`. Prefer
   `Box<"Name", primitive>` for new nominal scalars (the Atomics/Basics pattern)
   over `Brand` intersections (which the repo uses mainly in specs).
3. **Object shapes** via `Obj<{…}>` (decodable) / `Readonly<{…}>` (immutable
   plain data) — no classes, no methods on data.
4. **Expression bodies over statements** ("less statements, less block scope") —
   a function is ideally a single returned expression (nested ternary, `pipe`,
   `reduce`, `match*`). Phrase as: *prefer expression bodies; reach for
   `let`/`for`/`while`/`{ }` blocks only at irreducible imperative seams (DOM
   walks, byte buffers), and leave a comment justifying the deviation.*
5. **Data-last, curried, point-free** — operators take config first, return
   `(data) => result` to drop into `pipe`; builders are a seed function +
   data-last `T => T` transformers (`pipe(router(), get(…), route(…))`). No
   method-chaining builders.
6. **`Option` not null/undefined** — `some`/`none`, cross the world via
   `fromNullable`/`toOption`, eliminate via `getOr`/`matchOption`/`mapOption`/
   `chainOption`. `noUncheckedIndexedAccess` ⇒ wrap indexed reads
   (`fromNullable(parts[i])`). On the JSON wire a `None` field is **omitted**,
   never `null` (`forOptionProp` fails on present-`null`).
7. **`Result` not throw** — fallible code returns `Result<T,E>`; async chains use
   `proc(...)`; sync validation uses `cast(v, asObj, forProp(…), refine(…))`;
   throwing APIs are lifted with `tryCatch`; map error→transport once at the edge
   with `mapErr`. Note `proc`'s error type is fixed to `Error`, so client-side
   plgg-fetch code uses `pipe(await get(url), matchResult(onErr, onOk))`, not
   `proc`.
8. **Strict narrowing, zero escape hatches** — `as`/`any`/`@ts-ignore`/
   `@ts-expect-error` are prohibited as a fix for type errors. Narrow with
   `instanceof`, exported `isX` guards, and `asX` casters. Annotating a `pipe`
   callback param (`chainOption((x: T) => …)`) is an **annotation, not a cast** —
   the correct fix when inference yields `unknown`. `match*` needs explicit
   return-type + param annotations on **both** branches.
9. **Naming idioms** — `asX` caster, `isX` guard, `makeX`/lowercase-noun
   constructor (`box`, `web`, `router`), `X$` matcher, `xRefinable`/`xCastable`
   typeclass instances. JSDoc blocks explain the *why*, not the signature.
10. **Formatting** — Prettier `printWidth: 50`, `semi: true`, `singleQuote:
    false`, `trailingComma: "all"`, `bracketSameLine: false`. Tell agents not to
    fight the narrow wrap (expect tall, shallow-statement files; one arg/type-param
    per line).
11. **Testing** — Minimum Test Harness: one concise colocated `*.spec.ts(x)` per
    public function (args-in/values-out), real components over mocks, ≥90%
    coverage as the natural outcome. Close the `scripts/tsc-plgg.sh` +
    `scripts/test-plgg.sh` loop before considering an edit done.

### Anti-patterns the skill must explicitly tell agents NOT to emulate

- `packages/plgg-foundry/src/Foundry/model/{Foundry,Switcher,Processor,VirtualType}.ts`
  contain `as Str` / `as KebabCase` / `as Bool` casts and `TodoFoundry.ts` a
  mutable `let id = 0` — **non-canonical**; do not copy them (flagged for a
  separate cleanup).
- The handful of **grandfathered plgg-core internal seams** that use escape
  hatches by necessity (`Functionals/tryCatch.ts` `as unknown as E`,
  `Abstracts/Principals/Kind.ts` `@ts-ignore` for the HKT encoding,
  `Grammaticals/Function.ts`/`NonNeverFn.ts` `any[]` variadic plumbing) are
  **exceptions, not models** — the prohibition is absolute for new code; don't
  add new ones and don't cite these as precedent.
- Spec files may use `as` for fixtures, but prefer real casters even there.

### Exemplars to cite (file:line)

- `packages/plgg-router/src/Routing/usecase/{compilePattern,matchSegments,resolve}.ts`
  — whole files as single expressions (`map`/`reduce`/`pipe`).
- `packages/plgg-router/src/Routing/model/{Segment,Router}.ts`,
  `packages/plgg-server/src/Routing/model/Web.ts` — Box unions + data-last builders.
- `packages/plgg-server/src/Http/model/HttpError.ts` — Box-union error vocabulary
  + `$` matchers.
- `packages/plgg/src/Basics/Str.ts`, `Contextuals/Box.ts` — type+constructor+
  caster triad, `isX`/`asX`, typeclass instances.
- `packages/example/src/models/Todo.ts` (`cast`+`forProp`/`forOptionProp`) and
  `packages/example/src/controller/app.ts` (`proc` chain + single `mapErr` edge).
- `packages/plgg-router/src/Routing/usecase/client.ts:~104` — the rare justified
  `let`/`while` DOM walk with `instanceof` narrowing (no cast).

## Related History

- [20260527142355-create-plgg-view-presentation-layer.md](.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md) — Canonical statement of "the plgg way" (dogfood plgg types, add to core not stdlib, no OOP/method-chaining, expression-only bodies, errors-as-values, platform types only at the seam, >90% coverage). Primary source for the skill's content.
- [20260529003601-add-plgg-router.md](.workaholic/tickets/archive/work-20260528-143038/20260529003601-add-plgg-router.md) — Worked example of the scaffolding doctrine + concrete `as`-avoidance techniques (instanceof narrowing; annotate pipe callback params — annotation not cast).
- [20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md](.workaholic/tickets/archive/work-20260528-143038/20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md) — Decode-at-boundary casters, the `proc`→`mapErr` route pattern, the `Option`-None-omits-the-wire-key invariant, and the `proc` (Error) vs `pipe+matchResult` (ClientError) distinction.
- [20260226032724-add-claude-settings-json.md](.workaholic/tickets/archive/drive-20260226-032733/20260226032724-add-claude-settings-json.md) — The only prior `.claude/` ticket; confirms the tracking model (`settings.json` committed, `settings.local.json` git-ignored) this skill follows.
- Commit `8841831` removed the old local `.claude/` commands/agents when the workaholic plugins were adopted — so this `SKILL.md` is the first authored `.claude/` component in the current tree. Keep it complementary to the plugins (house *coding* style, which no plugin covers), not a re-implementation of them.

## Implementation Steps

1. **Create the skill dir** `.claude/skills/plgg-coding-style/` and `SKILL.md`
   with the trigger-phrased frontmatter `description` (see Key Files) and a
   `name`. Verify it appears as an available skill.
2. **Write the Hard Rules block** (top of SKILL.md): no `as`/`any`/`@ts-ignore`;
   `Option` not null; `Result` not throw; verify with `scripts/tsc-plgg.sh` +
   `scripts/test-plgg.sh`. Four lines, imperative.
3. **Write the idiom sections** (conventions 1–11 above), each ≤ ~8 lines with one
   before/after snippet drawn from the exemplars. Favor examples over prose.
4. **Write the anti-patterns section** — name the plgg-foundry casts and the
   grandfathered core seams as "do not emulate".
5. **Write Testing + See-also**: Minimum Test Harness + ≥90% coverage; link
   `standards:leading-validity`, `CLAUDE.md`, `.workaholic/constraints/quality.md`,
   `.workaholic/constraints/architecture.md`, `.workaholic/terms/core-concepts.md`.
6. **(Optional) reference.md** — move the exhaustive idiom catalog + file:line
   exemplars here; SKILL.md links to it for on-demand depth.
7. **Verify**: snippets in the skill must themselves obey the rules (no `as`/`any`
   in examples except where shown as the counter-example). Sanity-check that the
   skill text references `packages/`/`scripts/` (post-rename), not `src/`/`sh/`.

## Patches

> No patches — new authored Markdown. See Implementation Steps.

## Considerations

- **Trigger phrasing is the whole point.** A project skill only helps if its
  `description` reliably activates when an agent is about to write/edit TS under
  `packages/`. Invest in that line. (`.claude/skills/plgg-coding-style/SKILL.md`)
- **Distill, don't duplicate.** Link `standards:leading-validity` and the
  `.workaholic/` constraints as authority; the skill's value is the operational
  "how to write plgg code" patterns scattered across ticket Final Reports, made
  scannable. Avoid restating dependency-direction / export-convention / taxonomy
  (repo-structure, not coding style).
- **The skill must obey itself.** Its example snippets are plgg code — they must
  not contain `as`/`any` (except clearly-labelled counter-examples) and should
  read like the exemplar files.
- **Scope to coding style.** Per-package scaffolding (tsconfig flag set, vite
  lib+dts, coverage exclusions, `file:` deps) is build/structure doctrine — mention
  it only as orientation or link it; the skill is about how code is *written*.
- **Post-rename paths.** Reference `packages/` and `scripts/tsc-plgg.sh` /
  `scripts/test-plgg.sh` (the `sh/→scripts/`, `src/→packages/` rename has landed;
  CLAUDE.md is already updated).
- **Committed, project-local.** Place under `.claude/skills/` and commit it (not
  git-ignored) so it ships with the repo for all contributors and agents.

## Open Questions (decide during implementation, document in Final Report)

- **One file vs SKILL.md + reference.md** — recommend SKILL.md (rules + core
  idioms inline) plus a `reference.md` for the long catalog, if SKILL.md would
  otherwise exceed a comfortable progressive-disclosure size. Decide by length.
- **Strictness phrasing of "expression bodies"** — recommend the softened form
  ("prefer expression bodies; statements/loops only at irreducible imperative
  seams with a justifying comment") rather than an absolute ban, since core files
  (`proc.ts`, `cast.ts`, `match.ts`) legitimately use statements.
- **Nominal-type guidance** — recommend `Box<"Name", primitive>` for new nominal
  scalars (matching Atomics/Basics); note `Grammaticals/Brand` exists but is used
  mainly in specs. Confirm during implementation by surveying current usage.

## Final Report

Created the repo's first project-local Claude Code skill at
`.claude/skills/plgg-coding-style/` — `SKILL.md` (trigger-phrased frontmatter,
top Hard-Rules block, scannable idiom sections each with a faithful before/after
snippet, a "Do NOT emulate" section, and a See-also authority list) plus
`reference.md` (combinator cheat-sheet, the full Str triad + HttpError `$`-matcher
examples, the `proc`-vs-`pipe+matchResult` rule, an exemplar-file map, and a
structure-vs-style boundary note). The skill is committed (not git-ignored), so
it ships with the repo; it already shows up as an available skill in-session.

Snippets were drawn verbatim-in-spirit from real exemplars (`Str.ts`, `Box.ts`,
`compilePattern.ts`, `client.ts` `findAnchor`, `Todo.ts`, `app.ts`) and audited:
escape-hatch tokens (`as`/`any`/`@ts-ignore`) appear only in the prohibition, the
anti-pattern section, and the cheat-sheet "Not" column — never in a code example.
All paths use `packages/`/`scripts/` (post-rename). No TypeScript was touched, so
the tsc/test/build gates are unaffected.

### Open questions resolved
- **One file vs two** — went with SKILL.md **+** reference.md; SKILL.md alone
  would have been too long for comfortable progressive disclosure, so the
  exhaustive catalog lives in the sibling.
- **"Expression bodies" phrasing** — used the **softened** form ("prefer
  expression bodies; `let`/loops/blocks only at an irreducible imperative seam
  with a justifying comment"), with the `findAnchor` DOM-walk shown as the
  canonical exception, since core files legitimately use statements.
- **Nominal-type guidance** — recommended `Box<"Name", primitive>` for new
  nominal scalars and noted `Grammaticals/Brand` as mostly spec-only.

### Discovered Insights

- **Insight**: `.claude/` was deliberately emptied of local commands/agents in
  commit `8841831` when the project adopted the workaholic plugins — so this is
  the **first** authored `.claude/` component in the current tree. The skill is
  positioned to fill the one gap the plugins don't cover (house *coding* style),
  explicitly linking `standards:leading-validity`/`CLAUDE.md` rather than forking
  them, so it doesn't recreate the local-vs-plugin duplication that `8841831`
  removed.
  **Context**: Anyone tempted to add more local `.claude/` components should
  first check whether a plugin already owns that concern.
- **Insight**: A `SKILL.md` is source/config, not a `.workaholic/` artifact — so
  it correctly omits the `.workaholic/` conventions (`_ja.md` translation,
  `commit_hash`/`category` frontmatter, kebab-case-doc rules). The dir name must
  equal the frontmatter `name` (`plgg-coding-style`) for discovery.
  **Context**: Future project skills follow the same `.claude/skills/<name>/SKILL.md`
  shape, committed like `.claude/settings.json`.

### Deferred (unchanged)
- Cleaning the pre-existing `as <Type>` casts and `let id = 0` in `plgg-foundry`
  (the skill names them as "do not emulate"); a separate cleanup ticket.
- Refreshing the stale package counts in `infrastructure.md`/`component.md`
  (carried over from the rename ticket).
