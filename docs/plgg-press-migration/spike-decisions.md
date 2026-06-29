# plgg-press migration — corpus spike & decisions

Risk-reduction spike for replacing VitePress with an
in-house `plgg-press` static-site generator built on
`plgg` / `plgg-view` (zero new deps). This document is the
**durable record** that binds the later parser
(`plgg-md`), highlighter (`plgg-highlight`), theme
(`plgg-press`), the guide `site.config`, and the VitePress
removal. It was produced by inventorying the whole
`packages/guide` Markdown corpus, capturing the **exact**
VitePress-emitted heading slugs from a real build, and
diffing a theme-less TypeDoc regeneration.

All counts and slugs below are measured from the corpus at
the spike commit, not assumed. Construct examples are cited
as `file:line`. No production code changed; only this doc
is committed. The generated `api/*/` Markdown is
`.gitignore`d and regenerated on every build.

---

## 0. Corpus shape

- **Authored prose pages:** 25 Markdown files under
  `packages/guide` (concepts, contributing, getting-started,
  per-package pages, the hand-authored `api/index.md`, and
  the single `index.md` home).
- **Generated API pages:** 32 Markdown files under
  `api/<pkg>/` produced by `scripts/gen-api.mjs` (TypeDoc +
  `typedoc-plugin-markdown` + `typedoc-vitepress-theme`,
  then post-processed by `gen-api.mjs`'s `compact()`).
- **Only one file carries frontmatter:** `index.md` (the
  home). Every other page is frontmatter-free.

---

## 1. Construct inventory (per-construct counts + examples)

### Authored prose corpus (25 files)

| Construct | Count | Representative `file:line` |
|-----------|-------|----------------------------|
| ATX `# ` (h1) | 24 | `concepts/async.md:1` `Async with \`proc\`` |
| ATX `## ` (h2) | 70 | `concepts/async.md:24` |
| ATX h3–h6 | 0 | — (authored prose never goes below h2) |
| Fenced code (total) | 53 | see language table §2 |
| Pipe-table header-separator rows | 11 | `packages/plgg-view.md:26`, `packages/plgg/values-effects.md:30` |
| Unordered list items (`- `) | 71 | `packages/plgg-view.md:51` |
| Ordered list items (`1. `) | 12 | `getting-started.md` |
| Nested list items (indent ≥ 2 sp) | 12 | `packages/plgg-view.md:52` |
| Blockquotes (`> `) | 0 | — none in corpus |
| Thematic break / `<hr>` | 0 | the two `---` at `index.md:1,54` are **frontmatter fences**, not HRs |
| Inline bold `**…**` | 174 | `packages/plgg/values-effects.md:1` |
| Inline italic `*…*` | 19 | `packages/plgg/values-effects.md:47` |
| Inline code `` `…` `` | 850 | pervasive |
| Links — root-absolute `/…` | 129 | `api/index.md:14` `/getting-started` |
| Links — root-absolute + `#frag` | 7 | `concepts/validation.md:44` `/packages/plgg/values-effects#prefer-str-for-strings` |
| Links — relative `./` `../` | 0 | — none |
| Links — `.md`-suffixed | 0 | — none |
| Links — bare `#fragment` (same-page) | 0 | — none in authored prose |
| Links — external `http(s)://` | (in prose body, e.g. nav/config) | `https://github.com/qmu/plgg` |
| Images `![]()` | 0 | — none |
| Raw angle-brackets / HTML **outside** code | 0 | every `<…>` lives inside inline code or fences |
| Inline-code spans containing `<`/`>` | 74 | `concepts/option.md:3` `` `Option<T>` `` |
| Container directives `:::` (colon run = 3) | 34 | `api/index.md:30` `::: tip Regenerating locally` |
| Container directives `::::`+ (run ≥ 4) | **0** | none exist — see §4 note |
| Frontmatter blocks | 1 | `index.md` |

Container kinds used: `::: tip`, `::: warning` (with an
optional custom title after the kind, e.g.
`::: warning No hydration (yet)` at
`packages/plgg-view.md:145`). Closing fence is a bare
`:::`.

### Generated API corpus (32 files, after `gen-api.mjs` compaction)

| Construct | Count | Note |
|-----------|-------|------|
| ATX `# ` (h1) | 32 | one page title each (category name or package) |
| ATX `## ` (h2) | 717 | one per public symbol (promoted from TypeDoc's `###`) |
| ATX h3–h6 | 0 | `compact()` strips TypeDoc's `####` sub-tables |
| Fenced code `` ```ts `` | 711 | one signature block per symbol |
| Pipe tables | 0 | `compact()` drops the `#### Parameters` tables |
| Thematic break `***` | 0 | `compact()` drops the per-symbol `***` separators |
| Links — bare `#fragment` (same-page symbol xref) | 137 | `api/plgg-fetch/index.md:13` `#networkerror` |
| Links — root-absolute `/api/<pkg>/<slug>` | 22 | landing-page category links, **extension-less** |
| Links — `.md`-suffixed / relative | 0 | none in the theme-**on** output |
| Raw HTML | 0 | none |

**Takeaway:** the union of constructs the parser must
handle is small and bounded — ATX h1–h6, fenced code,
pipe tables, ordered/unordered/nested lists, inline
bold/italic/code, two link shapes (root-absolute and
`#fragment`, optionally combined), and `:::` containers.
No blockquotes, no images, no HRs in prose, no raw HTML
outside code, no `.md`/relative links, no `::::` runs.

---

## 2. Code-fence language inventory + alias map

### Distinct fence-language strings in the corpus

| Fence lang string | Authored | Generated | Example |
|-------------------|----------|-----------|---------|
| `typescript` | 45 | 0 (theme-on)\* | `concepts/async.md:9` |
| `ts` | 4 | 711 | `packages/plgg-test.md:25`, every `api/**` block |
| `bash` | 1 | 0 | `getting-started.md:16` |
| `sh` | 2 | 0 | `packages/example.md:78` |
| *(unlabeled)* | 1 | 0 | `packages/plgg-http.md:22` (ASCII dependency diagram) |

\* The raw theme-**off** TypeDoc output additionally emits
2 `typescript` fences (from doc-comment `@example`
blocks); the theme-on compacted output normalizes to `ts`.

So the corpus uses exactly **five** distinct fence tokens:
`typescript`, `ts`, `bash`, `sh`, and *unlabeled*.

### Normalization / alias map (for `plgg-highlight`)

Normalize the raw fence token (case-insensitively) before
dispatch:

| Raw token | Normalized | Highlighter route |
|-----------|------------|-------------------|
| `typescript` | `ts` | **TS-scanner set** |
| `ts` | `ts` | **TS-scanner set** |
| `javascript` | `js` | **TS-scanner set** |
| `js` | `js` | **TS-scanner set** |
| `tsx` | `tsx` | **TS-scanner set** |
| `jsx` | `jsx` | **TS-scanner set** |
| `json` | `json` | **TS-scanner set** |
| `bash` / `sh` / `shell` / `zsh` | (kept) | plain fallback |
| `text` / `txt` / `json5` / *unknown* | (kept) | plain fallback |
| *(unlabeled)* | `""` | plain fallback |

- **TS-scanner set** = `{ ts, tsx, js, jsx, json }` — these
  route to the TypeScript-based tokenizer/highlighter.
- **Plain fallback** = escaped `<pre><code>…</code></pre>`
  with no token coloring (just HTML-escaped text in a
  `language-<token>` class).
- In the **current** corpus only `typescript`/`ts`
  (→ `ts`) ever hit the TS-scanner set; `bash`, `sh`, and
  the unlabeled diagram all take the plain fallback. The
  `js/jsx/tsx/json` rows are defined now for forward-compat
  but are unused today.

---

## 3. EXACT heading-slug algorithm (verified against the live build)

VitePress slugs headings with `@mdit-vue/shared`'s
`slugify`, applied to the heading's **rendered plain text**
(inline Markdown already resolved: backticks → their text,
bold/italic → text, links → link text, HTML entities
decoded, zero-width chars dropped). A
reconstruction of this algorithm was run against **every
heading id in the emitted `dist/**/*.html`** and reproduces
**843 / 843** slugs exactly (0 mismatches), including
punctuation, backticks, generics, em-dashes, and
duplicates.

### Algorithm (`headingSlug`)

Given the heading's plain text `s`:

1. `s = NFKD(s)` — Unicode compatibility decomposition.
2. Remove combining marks `U+0300–U+036F`.
3. Remove control chars `U+0000–U+001F`.
4. Replace every **run** of "special" chars with a single
   `-`. The special set is:
   - all whitespace, and
   - `` ~ ` ! @ # $ % ^ & * ( ) - + = [ ] { } | \ ; : " ' _ < > , . ? / ``
   - plus the curly quotes `U+201C U+201D U+2018 U+2019`.
5. Collapse runs of `-` to a single `-`.
6. Strip leading/trailing `-`.
7. If the result starts with a digit, prefix `_`.
8. Lowercase.

**Critical retained characters:** any char **not** in the
special set survives literally — most importantly the
**em-dash `—` (U+2014)** and en-dash `U+2013`. They are
**kept in the slug**, not stripped. (This is the single
biggest parity trap; see §3b.)

**Backticks:** the slug is computed from the heading's
*text content*, so `` `Str` `` contributes `str` and the
backtick characters never appear (they are inline-code
delimiters, removed before slugifying).

**Generics `<T>`:** `<`, `>`, and `,` are special → become
separators, so `Html<Msg, T>` → `html-msg-t`.

**Underscore `_` and apostrophe `'`:** both are special →
become separators (`ICON_CONTENT` → `icon-content`,
`main_` → `main`, `isn't` → `isn-t`). *(Note: this means
the live algorithm includes `_` and ASCII `'` in the
special set even though some upstream `slugify` snapshots
omit them — the live build is authoritative.)*

### Per-page de-dup suffix scheme

Slugs are made unique **within each rendered page** by a
running counter: the **first** occurrence of a slug is
bare; each subsequent collision appends `-1`, `-2`, …
incrementing. The counter resets per page.

Evidence (`api/plgg/exceptionals.html`): three symbols
named `Defect` → ids `defect`, `defect-1`, `defect-2`.
(`api/plgg-http/index.html`): `badRequest` type +
`badRequest()` fn → `badrequest`, `badrequest-1`.

### Sample heading → slug table

| Heading (source) | Emitted slug | Notes |
|------------------|--------------|-------|
| `Prefer \`Str\` for strings` (`values-effects.md:62`) | `prefer-str-for-strings` | backtick text kept |
| `plgg — values & effects` (`values-effects.md:1`) | `plgg-—-values-effects` | **em-dash retained**, `&` dropped |
| `Atomics vs Basics — the one distinction worth learning` | `atomics-vs-basics-—-the-one-distinction-worth-learning` | em-dash retained |
| `The view tree — \`Html<Msg, T>\`` (`plgg-view.md:34`) | `the-view-tree-—-html-msg-t` | em-dash + generics |
| `SSR — \`renderToString\`` (`plgg-view.md:131`) | `ssr-—-rendertostring` | em-dash retained |
| `The runtimes (\`plgg-view/client\`)` | `the-runtimes-plgg-view-client` | `()` and `/` → `-` |
| `What it is (and isn't)` | `what-it-is-and-isn-t` | `'` → `-` |
| `Effects — compose, don't enumerate` | `effects-—-compose-don-t-enumerate` | em-dash + `,` + `'` |
| `Static site generation (\`plgg-server/ssg\`)` | `static-site-generation-plgg-server-ssg` | — |
| `## NetworkError` (API symbol) | `networkerror` | lowercase symbol name |
| `## Defect` ×3 (API) | `defect`, `defect-1`, `defect-2` | dedup |
| `### class_()` (API) | `class` | `_` → sep, `()` stripped by `gen-api` |
| `### ICON_CONTENT` (API) | `icon-content` | `_` → `-` |

### 3b. Corpus anchors `plgg-md` must reproduce — and the broken ones

The authored `#fragment` cross-page links pin the parity
requirement. There are **5 distinct targets**; only one
currently resolves against the live VitePress build:

| Authored link (source) | Target slug | Heading it aims at | Resolves today? |
|-------------------------|-------------|--------------------|-----------------|
| `…/values-effects#prefer-str-for-strings` (`validation.md:44`, `getting-started.md:46`) | `prefer-str-for-strings` | `Prefer \`Str\` for strings` | ✅ **YES** — fold MUST reproduce |
| `…/plgg-view#the-view-tree-html-msg-t` (`example.md:22`) | actual slug is `the-view-tree-—-html-msg-t` | `The view tree — \`Html<Msg, T>\`` | ❌ broken (em-dash) |
| `…/plgg-view#ssr-rendertostring` (`example.md:69`) | actual slug is `ssr-—-rendertostring` | `SSR — \`renderToString\`` | ❌ broken (em-dash) |
| `…/values-effects#functionals-effect-utilities` (`plgg-fetch.md:57`) | no such heading | — | ❌ dangling |
| `…/structures-errors#exceptionals-the-error-model` (`plgg-foundry.md:90`, `plgg-sql.md:97`) | actual slug is `the-error-model-—-errors-as-data` | `The error model — errors as data` | ❌ dangling |

**Decision:** `plgg-md`'s heading-slug fold reproduces the
VitePress algorithm above **exactly** (em-dash retained,
the `_`/`'` rules, per-page dedup). This guarantees:

- the one working authored anchor (`#prefer-str-for-strings`)
  keeps working, and
- all **137** generated-API `#fragment` symbol cross-refs
  (lowercased symbol names) keep working.

The **four already-broken** authored anchors are
**pre-existing content bugs**, *not* slug-algorithm
requirements (there is no live VitePress behavior to
"reproduce" for a link that already doesn't resolve). They
should be fixed in content by a follow-up ticket — either
by pointing them at the real em-dash slugs or (preferred)
by rewording those headings to drop the em-dash. Migrating
to `plgg-md` must **not** silently "fix" them by adopting a
different (em-dash-stripping) slug rule, because that would
break `#prefer-str-for-strings` parity and every API
cross-ref. Parity first; content fix separately.

> Optional hardening: `plgg-press` can add a **build-time
> anchor validator** (every in-site `#fragment` link must
> resolve to an emitted id) — which VitePress does **not**
> do today (its dead-link check covers pages, not
> anchors), and which would have caught all four bugs.

---

## 4. TypeDoc theme-off diff (keep TypeDoc, drop the VitePress theme)

Method: temporarily removed `typedoc-vitepress-theme` from
`packages/guide/typedoc.base.json`'s `plugin` array, re-ran
`npm run docs:api`, compared against the theme-on output,
then restored the file via `git restore` (committed state
intact — see §8).

**Findings — what the theme contributes:**

1. **Landing filename.** Theme-on emits the module landing
   as `index.md`; theme-**off**, `typedoc-plugin-markdown`
   emits it as `README.md`. `gen-api.mjs` reads
   `api/<pkg>/index.md` (line ~570), so dropping the theme
   breaks generation with `ENOENT api/plgg/index.md` unless
   `gen-api.mjs` is taught to read `README.md` (or pass
   `--mergeReadme`/`entryFileName`).
2. **`docsRoot` option.** `docsRoot: "."` in
   `typedoc.base.json` is **provided by the theme**.
   Theme-off, TypeDoc hard-errors `Unknown option 'docsRoot'`.
   It must be removed from the config when the theme is
   dropped. (Both edits were required to get a theme-off
   run at all.)
3. **`typedoc-sidebar.json`.** The theme writes a per-page
   `api/<pkg>/typedoc-sidebar.json`; theme-off it is not
   produced. `gen-api.mjs` already **discards** the
   theme's sidebar and writes its own
   `api/typedoc-sidebar.json`, so this output is not
   actually consumed.
4. **Link form.** In this repo each package is documented
   from a **single** `index.ts` entry point with
   `outputFileStrategy: "modules"`, so every symbol lands
   on one page and all TypeDoc cross-refs are same-page
   `#fragment` anchors (e.g. `[Cause](#cause)`) — **no
   inter-file links, no `.md` suffixes** in either theme
   mode. The theme's usual job of rewriting `.md` links to
   extension-less VitePress links is therefore a **no-op**
   here. (If a package ever splits into multiple TypeDoc
   output files, theme-off `typedoc-plugin-markdown` would
   emit `./file.md`-style relative links; the theme would
   make them extension-less root-absolute. Not a concern
   for the current single-entry setup.)

**Confirmed structural invariants (raw theme-off `README.md`):**

- Heading levels: `#` ×1 (module), `##` ×3 (kind groups:
  "Type Aliases", "Functions", …), `###` ×328 (one per
  symbol), `####` ×607 (`Type Parameters`/`Parameters`/
  `Returns` sub-tables), with a few `#####`/`######`. So
  **raw TypeDoc still emits `###`/`####`** — exactly what
  `gen-api.mjs`'s `compact()` consumes (it promotes `###`
  → `##` and strips `####` sub-tables).
- Fences: `` ```ts `` ×356 (+2 `typescript` from
  `@example` comments). So **`gen-api` still gets `ts`
  signature fences** without the theme.
- Per-symbol `***` thematic breaks present (compaction
  drops them).
- All intra-page links are `#fragment` symbol anchors.

**Conclusion (proves the migration thesis):** TypeDoc +
`typedoc-plugin-markdown` already produces everything
`gen-api.mjs` needs (`###`/`####` headings, `` ```ts ``
fences, `#fragment` xrefs). The VitePress theme's only
load-bearing contributions are the **`index.md` filename**
and the (now-redundant) `docsRoot`/sidebar. The
**keep-TypeDoc / drop-theme** plan is viable: the
theme-drop ticket must (a) teach `gen-api.mjs` to read
`README.md` as the module landing, and (b) remove
`docsRoot` from `typedoc.base.json`.

> Note on `::::` containers: the ticket anticipated
> `::::`-run (≥4 colon) fixtures in `plgg-view.md`. The
> live corpus contains **only `:::` (run = 3)** — there
> are zero runs ≥ 4. `plgg-md` should still parse a
> general `:{3,}` open fence matched by a same-or-shorter
> close (CommonMark-directive convention) for robustness,
> but no 4+-colon fixture exists to reproduce today.

---

## 5. Golden HTML snapshots

VitePress-rendered HTML for 5 prose pages + 2 API pages was
saved for later regression (the guide/TypeDoc
render-verification ticket diffs `plgg-press` output
against these):

Scratchpad dir
`…/scratchpad/golden/`:

- `index.html` (home — hero/features)
- `getting-started.html`
- `packages/plgg/values-effects.html`
- `packages/plgg-view.html` (tables, generics, containers, em-dash headings)
- `concepts/composition.html`
- `api/plgg/atomics.html` (generated, `ts` fences)
- `api/plgg-view/index.html` (generated, dedup slugs `text`/`text-1`)

Theme-on vs theme-off raw API Markdown were also snapshotted
to `…/scratchpad/api-theme-on/` and `…/scratchpad/api-theme-off/`.

---

## 6. Recorded decisions

### (a) Heading slugs
Reproduce the VitePress / `@mdit-vue/shared` algorithm
**exactly** (§3): NFKD → drop combining/control → ASCII-
punctuation-and-`_`-and-`'` runs → `-`, **em-/en-dash and
other non-ASCII retained**, collapse `-`, trim, digit-prefix
`_`, lowercase; per-page `-1/-2` dedup. Verified 843/843.

### (b) Home hero/features = SiteConfig **data**, not nested-YAML parsing
The only frontmatter in the corpus is `index.md`'s
`layout: home` block, whose `hero:` and `features:` keys
are **structured data the VitePress home theme renders
generically** (the `VPHero`/`VPFeatures` components — both
present in the built `index.html`). For `plgg-press`:

- The frontmatter parser only needs to detect the **flat
  marker** `layout: home` and otherwise **strip** the
  block; it does **not** need a general nested-YAML parser.
- The hero/features content moves into the **`SiteConfig`
  home data** (typed `plgg` records) and is rendered by the
  `plgg-press` home layout generically.

The data to model (current `index.md`):

```
hero:
  name: "plgg"
  text: "Web development as one typed pipeline"
  tagline: <prose>
  actions:
    - { theme: brand, text: "Get started",   link: /getting-started }
    - { theme: alt,   text: "Core concepts",  link: /concepts/ }
    - { theme: alt,   text: "View on GitHub", link: https://github.com/qmu/plgg }
features:
  - { title: "Option, not null",            details: <prose> }
  - { title: "Result, not throw",           details: <prose> }
  - { title: "One pipeline, end to end",    details: <prose> }
  - { title: "Runtime-neutral core",        details: <prose> }
  - { title: "Server and client, one program", details: <prose> }
  - { title: "Built from scratch",          details: <prose> }
```

So model `Hero { name, text, tagline, actions: [{ theme,
text, link }] }` and `Feature { title, details }` as
`SiteConfig` fields; the home page becomes a config-driven
layout, **not** a parsed Markdown body.

### (c) Raw angle-brackets / HTML = ESCAPE AS TEXT (v1)
The corpus has **zero** raw HTML / raw angle-brackets
outside code spans; every `<…>` is inside inline code or a
fence (74 inline-code spans contain `<`/`>`, all generics
like `Option<T>`). Decision: **no raw-HTML AST node** in
v1. Any stray `<`/`>`/`&` in text is **HTML-escaped as
literal text**, relying on `plgg-view`'s
`escape.ts` / `renderToString.ts` escaping. This is safe
because no page depends on raw HTML rendering.

### (d) Language inventory + alias map
Per §2. Five tokens in corpus (`typescript`, `ts`, `bash`,
`sh`, unlabeled). Normalize to the TS-scanner set
`{ts,tsx,js,jsx,json}` (today only `typescript`/`ts`→`ts`
qualify); everything else → escaped `<pre><code>` plain
fallback.

### (e) Prose-page `<title>` derives from the first H1 (Option)
Verified from the build: prose `<title>` = `<first-H1-text>
| <site-title>` (`getting-started.html` →
`Getting started | plgg`; `plgg-view.html` →
`plgg-view | plgg`). The home page has no H1 and uses the
**config title only** (`index.html` → `plgg`). Model the
page title as `Option<Str>` = "first H1 text if present";
`None` → fall back to the site config title (home's case).

### (f) Block + inline construct subset (see §7)

### (g) TypeDoc link forms the `href()` helper must handle
Only **two** shapes occur (both themes, this repo):
- **Root-absolute, extension-less:** `/api/plgg/atomics`,
  `/concepts/option`, `/packages/plgg/values-effects` —
  resolve to the output HTML path (append `index.html` for
  directory-style, `.html` otherwise), prefixed by the
  deploy `base` (`DOCS_BASE`, default `/`).
- **`#fragment`** (optionally appended to a root-absolute
  path) — resolve against the target page's slugged ids
  (§3).

There are **no** `.md`-suffixed or `./`-relative links in
the corpus to support in v1. (If TypeDoc output ever
splits across files, add `.md`→ extension-less rewriting
to `href()`; not needed now.)

---

## 7. Subset spec for `plgg-md` (v1)

The exact grammar `plgg-md` must support — bounded by the
inventory above. Everything outside this set takes the
out-of-subset fallback.

### Block constructs
- **ATX headings** `#`–`######` (h1–h6). Slug per §3;
  per-page dedup counter.
- **Fenced code** ` ```lang ` … ` ``` ` (and `~~~`).
  Capture the language token (→ §2 alias map). Body is
  verbatim, HTML-escaped. (No indented-code-block support
  needed — none in corpus.)
- **Pipe tables** — header row, `|---|:--:|`-style
  separator row (alignment colons honored), body rows.
- **Lists** — unordered (`-`/`*`/`+`), ordered (`1.`),
  and **nested** (indent-based, ≥ 2 spaces). List items
  may contain inline constructs and (for nesting) child
  lists.
- **Container directives** — `:{3,} kind [title]` … `:::`
  (close = bare colon run). Kinds in corpus: `tip`,
  `warning`. Render as a titled admonition block; default
  the title to the capitalized kind when none given. Parse
  a general `:{n>=3}` open / `:{>=3}` close for robustness
  even though only run = 3 occurs.
- **Frontmatter** — leading `---` … `---`. Detect the flat
  `layout: home` marker (→ home layout, §6b) and otherwise
  strip; no general nested-YAML parsing required for v1.
- **Paragraphs / blank-line separation.**
- **(Not needed in v1, absent from corpus):** blockquotes,
  thematic breaks/HR in prose, images, indented code,
  setext headings, HTML blocks.

### Inline constructs
- **Bold** `**…**`, **italic** `*…*`, **inline code**
  `` `…` `` (code text is escaped, never parsed further).
- **Links** `[text](href)` for the two `href` shapes in
  §6g (root-absolute extension-less, and/or `#fragment`);
  plus external `http(s)://`.
- **(Not needed):** images, reference links, autolinks,
  raw inline HTML.

### Raw HTML / angle-brackets
Escape as literal text (§6c). No raw-HTML node.

### Out-of-subset fallback
When the parser meets a construct outside this subset:

- **Default (lenient):** emit it as a **literal escaped
  paragraph** (text preserved, HTML-escaped) so the build
  never silently drops content.
- **Strict (opt-in / CI):** raise a **loud `SsgError`**
  identifying the `file:line` and the unsupported
  construct, so corpus drift is caught at build time rather
  than shipping degraded pages.

This keeps v1 small (the bounded grammar above) while
guaranteeing nothing renders as garbage and any future
out-of-subset authoring is caught.

---

## 8. Repo-green verification

- `packages/guide/typedoc.base.json` restored to committed
  state via `git restore` — `git diff` on it is **empty**
  (plugin array = `[typedoc-plugin-markdown,
  typedoc-vitepress-theme]`, `docsRoot: "."` present).
- API regenerated theme-on; `git status --short` is
  **clean** (the generated `api/*/` Markdown and
  `api/typedoc-sidebar.json` are `.gitignore`d; confirmed
  via `git check-ignore`).
- The **only** new tracked file is this document,
  `docs/plgg-press-migration/spike-decisions.md`.
- Golden snapshots + theme-on/off API snapshots live in the
  session scratchpad (outside the repo), not committed.
