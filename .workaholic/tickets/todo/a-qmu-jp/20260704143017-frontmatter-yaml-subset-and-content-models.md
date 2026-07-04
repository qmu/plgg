---
created_at: 2026-07-04T14:30:17+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260704143031-durable-core-sacrificial-shell-boundary.md]
---

# Frontmatter YAML-subset parser on plgg-parser + caster-backed content models declared in `site.config`

## Overview

Phase 5 (Server & data), ticket **17** of the plggpress/plggmatic roadmap —
implements **D8** ("Both layers, one truth: YAML-subset frontmatter parser
built on plgg-parser, validated against caster-backed content-model types
declared in config") from the approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. This is the
foundation of the MicroCMS-like **typed custom attributes** in the vision:
authors write frontmatter on their Markdown pages, the site declares what
those attributes must look like, and the build fails with precise errors when
the two disagree. Roadmap tickets **16** (delivery API — serves the typed
attributes), **20** (admin UI), and **30** (Claude Code plugin export —
"skills generated from content structure", D17) all consume what this ticket
lays down.

Today the two halves are deliberately primitive:

- `plgg-md`'s `Frontmatter` is a **layout-marker-only** model
  (`packages/plgg-md/src/Frontmatter/model/Frontmatter.ts`): a single
  `layout: Option<SoftStr>` detected by regex, everything else in the
  `---` block silently stripped (`parseFrontmatter.ts` — "No nested-YAML
  parsing", per `docs/plggpress-migration/spike-decisions.md` §6b). That was
  the right call for the migration corpus; a CMS with user-defined attributes
  outgrows it. Notably, the current guide corpus carries **zero** frontmatter
  blocks (even `index.md`'s old `layout: home` marker is gone), so this is
  the ideal moment to extend the model: nothing in production exercises it.
- `plggpress`'s `SiteConfig`
  (`packages/plggpress/src/SiteConfig/model/SiteConfig.ts`) has no notion of
  content models; nothing validates a page's frontmatter against anything.

Design (zero new deps; plgg-parser and the plgg casters are the whole
toolbox):

1. **YAML-subset value model** (`plgg-md`, new `Yaml` domain). A `YamlValue`
   Box union in house style: string, number, boolean, sequence, map — where a
   top-level document is a map whose values are scalars, sequences of
   scalars, or **one-level** nested maps of scalars (matching the D8 bound).
   The model's doc comment is the **normative subset specification**,
   including the exclusions: anchors/aliases (`&`/`*`), tags (`!!`), merge
   keys (`<<`), multi-line block scalars (`|`/`>`), flow collections
   (`[...]`/`{...}`), multi-document streams, and YAML 1.1 implicit types
   beyond number/boolean (no `yes/no/on/off`, no sexagesimals, no
   timestamps — dates are written as quoted strings until a consumer earns a
   branded date field). Full-line `#` comments and blank lines are allowed;
   plain and single/double-quoted scalars are supported; duplicate keys are
   an error, not last-wins.
2. **Parser on plgg-parser.** `parseYamlSubset: SoftStr →
   Result<YamlMap, InvalidError>` built from the existing combinators
   (`literal`/`satisfy`/`sepBy`/`many`/`or`/`between`/`run` in
   `packages/plgg-parser/src/Parse/usecase/`), stateless PEG backtracking,
   concrete-`S` pinning as plgg-highlight does. Failures surface through
   `parseError` (`Parse/model/ParseError.ts`), which already folds the
   failing position into the `InvalidError` — the raw material for the
   "precise errors" requirement. `plgg-md` gains a `plgg-parser` dependency,
   wired exactly like `packages/plgg-highlight/package.json` does
   (`"plgg-parser": "file:../plgg-parser"`); build order is already correct
   (`scripts/build.sh` builds plgg-parser at line 20, plgg-md at line 33),
   so **no runner-script edits** — this ticket creates no new package.
3. **The one-truth bridge.** `foldYaml: YamlValue → unknown` collapses the
   parsed tree to plain JSON-ish data (string/number/boolean/array/record)
   so the ordinary plgg casters (`cast`, `asObj`, `forProp`,
   `forOptionProp`, `asReadonlyArray`, `asStr`, `asNum`, `asBool`) validate
   frontmatter with the **same vocabulary** that already validates
   `site.config` — that is what "both layers, one truth" cashes out to.
4. **Frontmatter model extension** (`plgg-md`). `Frontmatter` grows a
   `data: Option<YamlMap>` field carrying the full parsed block (`None` when
   the page has no fence); `layout` stays, now **derived** from the map's
   `layout` key when it is a string, so `MarkdownDoc`, the theme, and
   `notFound.ts` keep compiling with their current reads. `parseFrontmatter`
   is rewritten on `parseYamlSubset`; the unterminated-fence error and the
   fence-less pass-through behavior are preserved; a malformed block is now a
   positioned `Err`, no longer silently stripped.
5. **Content models in config** (`plggpress`, new `ContentModel` domain).
   Models are **declarative data, not raw functions**: a closed `FieldType`
   sum (`text | number | boolean | list-of-scalar | group-of-scalars` — the
   one-level bound again), fields with a name and a required/optional flag,
   and a `ContentModelBinding` attaching a model to a content directory
   prefix (the MicroCMS "API"/collection analogue). Declarative data is what
   ticket 16's delivery API can serve and D17's plugin export can introspect;
   a function-valued config would be opaque. `casterOf(model)` is the
   caster-backed half of D8: an interpreter folding a `ContentModel` into a
   `(value: unknown) → Result<…, InvalidError>` caster via exhaustive `match`
   over `FieldType`, built from the plgg caster primitives. `SiteConfig` /
   `SiteConfigInput` / `asSiteConfig` / `defineSite` gain an **optional**
   `models` entry (absent ⇒ no validation), so every existing `site.config.ts`
   remains valid unchanged.
6. **Build-time validation** (`plggpress`). A `checkModels` pass mirroring
   the existing `CheckLinks` shape (`src/CheckLinks/`): for every discovered
   page under a bound directory, split frontmatter, `foldYaml`, run the
   model's caster; collect **all** violations (not first-failure) into a
   typed `ModelViolations` error naming file, field, and reason — and, for
   syntax errors, the parser position. `build.ts`'s error channel widens from
   `SsgError | Defect | BrokenLinks` accordingly; the dev server keeps its
   existing loud-failure behavior (`pageHandler` already folds render errors
   to `internalError`).

## Policies

- `workaholic:implementation` / `policies/quality.md` — the TypeScript
  compiler under strict mode is the sole static-analysis gate: the YAML
  subset and the `FieldType` grammar become **closed sums folded with
  exhaustive `match`**, so an unhandled variant is a compile error; strictly
  no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50` per package.
- `workaholic:implementation` / `policies/test.md` — the 90% four-metric
  coverage doctrine, one co-located `.spec.ts` per module, flat `test()`
  calls, absolute imports. Both touched packages are already gated at 90
  (`packages/plgg-md/plgg-test.config.json`,
  `packages/plggpress/plgg-test.config.json`); the new domains must clear
  those gates, and the parser must be specced against hostile input, not
  just the happy path.
- `workaholic:design` / `policies/security.md` — frontmatter is
  **untrusted author input** crossing into the typed core (soon guest-edited
  content, D4's revisit trigger). The parser must be fail-closed: bounded
  grammar, every malformed input an `Err` on the `Result` channel, never a
  throw, and no pathological backtracking blowup on adversarial documents.

## Key Files

- `packages/plgg-md/src/Frontmatter/model/Frontmatter.ts` — the layout-only
  marker to extend (its doc comment citing §6b must be rewritten to cite the
  new subset spec).
- `packages/plgg-md/src/Frontmatter/usecase/parseFrontmatter.ts` (+ spec) —
  fence splitting, `LAYOUT_HOME_RE`, the unterminated-fence error; rewired
  onto the YAML-subset parser.
- `packages/plgg-md/src/Yaml/` — **new** domain: `model/YamlValue.ts`
  (Box union + normative subset doc comment), `usecase/parseYamlSubset.ts`,
  `usecase/foldYaml.ts`, specs, `index.ts` barrels per the existing
  `Block`/`Inline` layout.
- `packages/plgg-md/src/index.ts`, `src/Frontmatter/index.ts` — barrels to
  extend.
- `packages/plgg-md/package.json`, `tsconfig.json` — add the `plgg-parser`
  dependency (mirror `packages/plgg-highlight/package.json`; bundle
  externals are derived, self-alias `paths` unchanged).
- `packages/plgg-parser/src/Parse/usecase/` (`primitive.ts`, `sequence.ts`,
  `choice.ts`, `repeat.ts`, `run.ts`) and `Parse/model/ParseError.ts` — the
  combinator surface consumed; read-only unless a genuinely generic
  combinator is missing (add it there with specs, not privately in plgg-md).
- `packages/plgg-md/src/Render/usecase/renderMarkdown.ts` +
  `src/Render/model/MarkdownDoc.ts` — the pipeline that threads
  `parsed.frontmatter` into `MarkdownDoc`; compiles unchanged apart from the
  richer `Frontmatter`.
- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts` (+ spec) —
  `SiteConfig`/`SiteConfigInput`/`asSiteConfig`/`defineSite` gain the
  optional `models` entry; the existing caster style here is the template
  for `casterOf`.
- `packages/plggpress/src/ContentModel/` — **new** domain:
  `model/ContentModel.ts` (FieldType sum, fields, bindings + casters),
  `usecase/casterOf.ts`, `usecase/checkModels.ts`, specs, barrels.
- `packages/plggpress/src/index.ts` — the **public barrel** every
  `site.config.ts` imports from (today it exports `SiteConfigInput` /
  `defineSite` / `asSiteConfig` alongside `SidebarItemInput` etc.; the guide's
  `packages/guide/.../site.config.ts` does
  `import { defineSite, type SidebarItemInput } from "plggpress"`). The new
  `ContentModel` / `FieldType` / `Field` / `ContentModelBinding` **input**
  types and their casters, plus any builder helpers, **must be re-exported
  here** — this is the only surface `site.config.ts` can reach, so without it
  a config cannot declare `models` with type-checking. This is the concern-51
  wiring point ("plggpress export map needs types+default entries for
  `require()` consumers", roadmap §"Known constraints honored throughout"):
  the `package.json` `exports["."]` maps `types`→`./dist/index.d.ts` and
  `default`→`./dist/index.es.js`, both generated from this `src/index.ts`, so
  extending this barrel is sufficient — **no `package.json` `exports` edit**,
  keeping criterion 7's "only `package.json` change is plgg-md's `plgg-parser`
  dependency" intact.
- `packages/plggpress/src/CheckLinks/model/CheckLinks.ts` +
  `usecase/checkLinks.ts` — the corpus-walking validation pass to mirror
  (shape, error aggregation, build wiring).
- `packages/plggpress/src/build.ts` (+ `build.spec.ts`) — error channel
  widens; the model check joins the link check in the build pipeline.
- `packages/plggpress/src/theme/notFound.ts` — constructs
  `frontmatter(none())` today; the one in-repo constructor call to update.
- `packages/guide/**/*.md` — the live corpus: currently **zero** frontmatter
  blocks, which makes the byte-identity regression gate cheap and honest.

## Related History

- `.workaholic/tickets/archive/work-20260630-013457/20260630013458-md-corpus-spike-and-decisions.md`
  and `docs/plggpress-migration/spike-decisions.md` §6b — the deliberate
  layout-marker-only decision this ticket supersedes. It was corpus-driven
  ("only one file carries frontmatter"); D8 changes the requirement, not the
  method: stay corpus-honest, now against the CMS vision.
- `.workaholic/tickets/archive/work-20260630-013457/20260630013501-plgg-md-scaffold-frontmatter-block-ast.md`
  (story `.workaholic/stories/work-20260630-013457.md`) — founded the
  `Frontmatter` model, the fence splitter, and plgg-md's Box-union AST
  house shape the `Yaml` domain must follow.
- `.workaholic/tickets/archive/work-20260704-015006/20260704015133-create-plgg-parser-combinator-library.md`
  (story `.workaholic/stories/work-20260704-015006.md`) — plgg-parser's
  founding: zero-dep combinators, PEG stateless backtracking, proof-by-demo
  via the TS lexer; plgg-highlight is the first consumer and the wiring
  template. This ticket makes plgg-md the second consumer.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  — established plggpress's current direct-deps layout and the
  `framework/` seam this ticket leaves untouched.
- Sibling roadmap tickets: **02** (harden-coverage-gate-defaults) makes the
  90 gates load-bearing — assume enforcement; **16**
  (plggpress-content-index-and-delivery-api, not yet written) serves the
  typed attributes and the model schema over the delivery API; **14**
  (serve-mode-dual-config) owns the phase-5 SSG byte-identity gate this
  ticket must also respect; **30** (claude-code-plugin-export) generates
  skills from the content structure declared here (D17). No file overlap
  with tickets 01–15.

## Implementation Steps

1. **Write the subset spec first.** Draft the normative doc comment for
   `YamlValue` (`packages/plgg-md/src/Yaml/model/YamlValue.ts`): supported
   forms (plain/single/double-quoted scalars; integer and float numbers;
   `true`/`false`; block sequences `- item`; one-level nested block maps;
   full-line `#` comments; blank lines; duplicate keys rejected) and the
   explicit exclusion list (anchors/aliases, tags, merge keys, block
   scalars `|`/`>`, flow collections, multi-doc, `yes/no/on/off`,
   timestamps). Define the `YamlValue` Box union + constructors in house
   style. This comment is the contract every spec cites.
2. **Wire plgg-md → plgg-parser.** Add
   `"plgg-parser": "file:../plgg-parser"` to
   `packages/plgg-md/package.json` dependencies, mirroring plgg-highlight.
   No `scripts/` edits: plgg-parser already precedes plgg-md in
   `scripts/build.sh` (lines 20/33) and `scripts/npm-install.sh`
   (lines 10/18); no new package, so `check-all.sh` is untouched.
3. **`parseYamlSubset`** (`src/Yaml/usecase/parseYamlSubset.ts`): the
   grammar from step 1 on plgg-parser combinators, `run` to a
   `Result<YamlMap, InvalidError>` whose errors carry the failing position
   (`parseError`). If a missing combinator is genuinely generic, add it to
   `plgg-parser` with its own spec instead of hand-rolling locally. Specs:
   every supported form; every exclusion rejected with a positioned error;
   duplicate keys rejected; hostile inputs (unbalanced quotes, tab
   indentation, deep fake nesting, multi-KB garbage) return `Err` promptly —
   no throw, no hang.
4. **`foldYaml`** (`src/Yaml/usecase/foldYaml.ts`): exhaustive `match` from
   `YamlValue` to plain `unknown` data. Spec: a folded map round-trips
   through plgg casters (`cast`/`asObj`/`forProp`/`asStr`/`asNum`/`asBool`/
   `asReadonlyArray`) — the one-truth bridge demonstrated in plgg-md's own
   suite.
5. **Extend `Frontmatter` + rewrite `parseFrontmatter`.** Add
   `data: Option<YamlMap>`; derive `layout` from the map's string-valued
   `layout` key (dropping `LAYOUT_HOME_RE`); keep fence-less pass-through
   and the unterminated-fence `Err`; malformed YAML inside a fence becomes a
   positioned `Err`. Update the model doc comment (retire the §6b citation),
   `parseFrontmatter.spec.ts`, and the `frontmatter(...)` constructor call
   in `packages/plggpress/src/theme/notFound.ts`. `renderMarkdown` and
   `MarkdownDoc` must compile without behavioral change for
   frontmatter-free sources.
6. **`ContentModel` domain in plggpress**
   (`src/ContentModel/model/ContentModel.ts`): closed `FieldType` sum
   (`text | number | boolean | list | group` with the scalar-element /
   scalar-fields bounds), `Field` (name, type, required flag),
   `ContentModel`, `ContentModelBinding` (content-dir prefix + model), with
   input types and casters in the exact `SiteConfig.ts` style.
7. **`casterOf`** (`src/ContentModel/usecase/casterOf.ts`): fold a
   `ContentModel` into an `(unknown) → Result` caster via exhaustive
   `match` over `FieldType`, required fields via `forProp`, optional via
   `forOptionProp`. Spec: valid data passes typed; each violation kind
   (missing required, wrong scalar type, non-scalar list element, unknown
   nesting) yields an `InvalidError` naming the field.
8. **`SiteConfig.models`**: optional `models` on `SiteConfigInput` /
   `SiteConfig` (absent ⇒ empty), threaded through `asSiteConfig` and
   `defineSite` (the `asSiteConfig` `cast(...)` pipeline gains a
   `forOptionProp("models", ...)` rung in the exact style of its existing
   `forProp` rungs; `SiteConfigInput` gains an optional `models?:` field of
   the new input type). **Re-export the new `ContentModel` / `FieldType` /
   `Field` / `ContentModelBinding` input types + casters (and any builder
   helpers) from the public barrel `packages/plggpress/src/index.ts`**,
   beside the existing `SiteConfigInput` / `defineSite` / `asSiteConfig`
   exports — that barrel is the surface `site.config.ts` imports from
   (`import { defineSite } from "plggpress"`), so a config cannot type-check a
   `models` declaration until the types live there. Extending `src/index.ts`
   is enough: the `package.json` `exports["."]` (`types`→`./dist/index.d.ts`,
   `default`→`./dist/index.es.js`) is regenerated from it, so no
   `package.json` `exports` change (concern 51). Spec: the existing fixture
   configs under `src/Config/usecase/fixtures/` still load unchanged; a config
   with models validates; a malformed model declaration fails at config load
   with a field-naming error.
9. **`checkModels`** (`src/ContentModel/usecase/checkModels.ts`), mirroring
   `CheckLinks`: walk the discovered pages, match each against the bindings
   by directory prefix, parse + fold + cast, aggregate **all** violations
   into a `ModelViolations` value (file, field, reason, position for syntax
   errors). Pages under no binding are only checked for frontmatter
   well-formedness. Widen `build.ts`'s error channel
   (`SsgError | Defect | BrokenLinks | ModelViolations`) and run the pass
   beside the link check; update `build.spec.ts`.
10. **Runnable demo (fixture-level).** A plggpress spec fixture: a tiny
    corpus + `models`-bearing config where one page violates its model;
    assert the build fails listing the exact file/field/reason, then fix
    the fixture page and assert the build succeeds with the typed
    attributes visible on the parsed `Frontmatter`. This is the
    proof-of-value artifact to quote in the PR.
11. **Guide byte-identity.** Build the guide before and after the change
    (`npx plggpress build` per its current invocation) and diff the output
    trees byte-for-byte — the corpus has no frontmatter and declares no
    models, so the SSG output must be identical.
12. House rules throughout: no `as`/`any`/`ts-ignore`; `Option`/`Result` +
    exhaustive `match`; prefer `Str`/`asStr` over `SoftStr` in new code
    where seams allow; Prettier `printWidth: 50`; **zero new dependencies**
    (the plgg-md→plgg-parser edge is workspace-internal); no edits under
    `scripts/`.

## Quality Gate

**Acceptance criteria**

1. **Subset is specified and enforced:** `YamlValue`'s doc comment states
   the supported grammar and the exclusion list, and for every named
   exclusion a spec proves the parser rejects it with a positioned
   `InvalidError`.
2. **One truth:** frontmatter validation runs through the same plgg caster
   vocabulary as `site.config` — `casterOf` output is an ordinary caster
   over `foldYaml`ed data; no second validation mechanism exists.
3. **Models are declarative:** `SiteConfig.models` is pure data validated
   by `asSiteConfig`; a follow-up consumer (ticket 16) could serialize the
   declared schema without executing author code.
4. **Precise failures:** the fixture demo (step 10) fails the build naming
   file, field, and reason for each violation — all violations reported in
   one run, not first-failure — and a syntax error reports its position.
5. **Fail-closed on hostile input:** no spec observes a throw or a hang
   from `parseYamlSubset`/`parseFrontmatter` on the adversarial input
   table.
6. **No regression:** frontmatter-free sources render exactly as before;
   existing config fixtures load unchanged; the guide's SSG output is
   byte-identical (step 11 diff is empty).
7. **No escape hatches, no new deps:** `grep` over the new/changed modules
   finds no `as `/`any`/`ts-ignore`; the only `package.json` change is
   plgg-md's `plgg-parser` file: dependency; no `scripts/` edits.
8. **Coverage:** plgg-md and plggpress both clear their 90 thresholds on
   all four metrics; plgg-parser stays green if extended.

**Verification method**

Run `scripts/tsc-plgg.sh`, `scripts/test-plgg-md.sh`,
`scripts/test-plgg-parser.sh`, and `scripts/test-plggpress.sh` and paste the
gate lines; quote the step-10 fixture failure output (the precise-error
proof) and the empty step-11 diff in the PR; then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask the new
plgg-md→plgg-parser edge in consumers) must be green end-to-end.

**Gate**

All eight acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. Any silently-stripped malformed frontmatter, any validation
path bypassing the caster vocabulary, any `as`/`any`/`ts-ignore`, any new
dependency, or a non-empty guide output diff fails the ticket.

## Considerations

- **Subset creep is the main risk.** Authors will eventually ask for block
  scalars, dates, or deeper nesting. The exclusion list in `YamlValue`'s
  doc comment is the line of defense: extending the subset means amending
  that spec (and D8's bound) in a ticket, never quietly in the parser.
  Deeper-than-one-level maps in particular should be refused until a real
  consumer earns them.
- **Date/timestamp fields are deferred.** MicroCMS-style date attributes
  are written as quoted strings for now; a branded date `FieldType` (parsed
  via a plgg `Time` caster) is a natural, small follow-up once ticket 16 or
  18 needs to sort or filter by one.
- **`layout` stays special only temporarily.** With `data` carrying the
  whole map, `layout` is just a derived convenience read; when the theme
  work of tickets 07/09 revisits layouts, it may consume
  `data` directly and the dedicated field can be retired (breaking changes
  are acceptable here).
- **Unbound pages.** Pages under no `ContentModelBinding` get
  well-formedness checking only. If plggpress later wants a strict mode
  ("every page must be bound"), that is a one-flag extension of
  `checkModels` — note it in ticket 16 if the delivery API needs the
  guarantee.
- **Delivery/introspection is ticket 16's half:** exposing the declared
  model schema and the validated attributes over the content index /
  delivery API (and later the D17 plugin export) builds on the declarative
  `ContentModel` data; nothing in this ticket may assume an HTTP surface.
- **Revisit triggers:** guest web editing of articles (D4) turns
  frontmatter into truly hostile input — re-audit the parser's adversarial
  spec table then; if ticket 16 finds itself re-validating frontmatter with
  ad-hoc checks, the `casterOf` vocabulary is incomplete — extend it rather
  than letting a second truth appear; i18n content modeling stays in the
  roadmap's deliberately-deferred list.
