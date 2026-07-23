---
created_at: 2026-07-14T20:22:39+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash: db03ae5b
category: Changed
depends_on:
mission:
---

# Replace plgg-md's hand-rolled block + inline parsers with plgg-parser combinators

## Overview

plgg-md renders every plggpress document, but its markdown grammar is parsed by
**hand-rolled, regex-driven, line-oriented code** in two files — the block
grammar (`Block/usecase/parseBlocks.ts`, 703 lines; `FENCE_RE`-style regex line
scanning) and the inline grammar (`Inline/usecase/renderInline.ts`, 325 lines).
Meanwhile plgg-md **already depends on plgg-parser** and already uses it — but
only for the YAML front-matter subset (`Yaml/usecase/parseYamlSubset.ts`), which
is a clean, proven, in-repo template for the combinator style (`Parser<A, null>`,
`map`/`or`/`right`/`between`/`many`/`noneOf`/`char`/`anyChar`, positioned errors).

This ticket converts **both** the block and inline parsers to plgg-parser
combinators, so the whole markdown pipeline speaks one parsing vocabulary
(the zero-dep combinator core the family committed to) instead of ad-hoc regex
line-slicing — the "refactor the low-quality seed, don't keep cloning it"
discipline. plgg-highlight already tokenizes with plgg-parser; parseYamlSubset
already does; this closes the gap for the markdown core itself.

**This is a PURE IMPLEMENTATION SWAP — behavior must not change.** The output
(the `Block`/`Inline` AST and the final HTML) must be **byte-identical** to
today's, because every plggpress site (`plgg-guide.qmu.dev`, `strategy.qmu.dev`,
a future qmu.co.jp — all render through plgg-md's one baked-in pipeline) depends
on it. The public API (`renderMarkdown`, `renderMarkdownWithOptions`,
`parseBlocks`, `renderInline`) stays stable; only the innards change.

## Policies

The implementing session MUST read each linked policy hard copy before writing
code and keep every change defensible against its Goal (目標), Responsibility
(責務), and Practices (実践).

- `workaholic:implementation` / `policies/coding-standards.md` — combinator,
  expression-style, Option/Result, exhaustive `match`, **no `as`/`any`/
  `ts-ignore`**, printWidth 50; the new parsers read like `parseYamlSubset.ts`.
- `workaholic:implementation` / `policies/directory-structure.md` — keep the
  `Block/` and `Inline/` usecase/model split; the combinator code replaces the
  regex code in place, no new top-level packages.
- `workaholic:implementation` / `policies/machine-checkable-gaps.md` (if present
  under the pillar index) — a combinator grammar makes the parse structure
  type-checked rather than regex-implicit; lean into that.
- `workaholic:operation` / `policies/ci-cd.md` — the change rides the
  consolidated gates; the byte-identical golden diff + the existing plgg-md spec
  suite + `check-all` are the safety net, since every rendered site depends on
  this code.

## Key Files

- `packages/plgg-md/src/Block/usecase/parseBlocks.ts` — **rewrite target 1** (the
  703-line regex line-grammar): headings, paragraphs, fenced code (info string),
  lists, block-quotes, tables (alignment), callouts, thematic breaks, and the raw
  HTML-block / paragraph fallthrough. Reproduce the SAME `Block` AST.
- `packages/plgg-md/src/Inline/usecase/renderInline.ts` — **rewrite target 2**
  (the 325-line inline scanner): emphasis/strong, inline code, links, autolinks,
  images, raw inline HTML, escapes. Reproduce the SAME inline output.
- `packages/plgg-md/src/Yaml/usecase/parseYamlSubset.ts` — **the in-repo pattern
  to copy** (plgg-parser already used here for front-matter scalars).
- `packages/plgg-md/src/Block/model/Block.ts`, `Inline/model/Inline.ts` — the
  AST the parsers target; **unchanged** (the output contract).
- `packages/plgg-md/src/Render/usecase/renderMarkdown.ts` — the orchestrator
  (`parseBlocks` → walk → `renderInline`); its public API is **unchanged**.
- `packages/plgg-parser/src/Parse/**` — the combinator surface available:
  `char`, `literal`, `satisfy`, `oneOf`/`noneOf`, `many`/`many1`, `seq`, `or`,
  `map`, `between`, `sepBy`/`sepBy1`, `optional`, `lookahead`, `notFollowedBy`,
  `lazy`, `left`/`right`, `eof`, `run`, user-state (`getUserState`/
  `putUserState`), positioned `parseError`.
- Spec safety net (must all stay green): `Block/usecase/parseBlocks.spec.ts`,
  `Inline/usecase/renderInline.spec.ts`, `Render/usecase/renderMarkdown.spec.ts`,
  `Render/usecase/slugify.spec.ts`, `Block/model/Block.spec.ts`,
  `Frontmatter/usecase/parseFrontmatter.spec.ts`.
- Golden-diff corpora (byte-identical gate): `packages/guide/` and
  `../strategy/docs/` rendered through plggpress — the real documents this
  parser must reproduce unchanged.

## Related History

The combinator core exists and is already trusted in this exact family; this
ticket extends its reach to the markdown grammar itself.

- plgg-parser is the zero-dep combinator lib (`Parser<A,S>` + user-state slot,
  PEG stateless backtracking so no `attempt`, concrete-`S` pinning). plgg-highlight
  already tokenizes with it; plgg-md's `parseYamlSubset.ts` already parses YAML
  front matter with it — precedent on both sides of plgg-md.
- The current block grammar is the "bounded plggpress subset" (referenced in the
  package's `spike-decisions.md §7`): the rewrite reproduces exactly that subset,
  not CommonMark-at-large.

## Implementation Steps

1. **Capture the golden baseline FIRST (before touching parser code).** Build the
   guide and strategy sites at the current HEAD and save their rendered HTML
   (`packages/guide/dist`, `../strategy/dist`) as the golden reference; and/or add
   a plgg-md golden spec that renders a representative corpus sample (the guide's
   `.md` set) through `renderMarkdown` and snapshots the output. This is the
   byte-identical oracle.
2. **Rewrite the inline parser** (`renderInline.ts`) onto plgg-parser first (it is
   smaller and self-contained), following `parseYamlSubset.ts`: `Parser<_, null>`
   (concrete-`S` pinned, no user-state unless a case truly needs it), the
   emphasis/code/link/autolink/image/escape/raw-HTML grammar as composed
   combinators, PEG ordered choice replacing the regex branch order. Keep
   `renderInline`'s signature and output identical.
3. **Rewrite the block parser** (`parseBlocks.ts`) onto plgg-parser: the
   line/block grammar (headings, fenced code + info string, lists incl. nesting,
   quotes, tables + alignment, callouts, thematic breaks, HTML-block/paragraph
   fallthrough) as combinators emitting the SAME `Block` AST. Preserve the exact
   fallthrough order (raw HTML → paragraph) so ambiguous input lands identically.
4. Keep the `renderMarkdown` orchestration and the public exports byte-for-byte
   compatible; delete the dead regex helpers once their combinator replacements
   pass.
5. **Verify byte-identical**: run the full plgg-md spec suite (green, coverage
   >90%), then rebuild the guide + strategy and `diff` the new rendered HTML
   against the golden baseline from step 1 — the diff MUST be empty. Investigate
   and eliminate ANY difference (a diff = a behavior change = not done).
6. Run the full fresh `check-all` (plggpress and every downstream consumer render
   through plgg-md, so this is where a subtle regression would surface).

## Quality Gate

Captured from the developer at ticket time (2026-07-14): **byte-identical output
is the bar** — this is a pure implementation swap of code every plggpress site
renders through.

**Acceptance criteria** — the checkable conditions that must hold:

- `parseBlocks.ts` and `renderInline.ts` are implemented with **plgg-parser
  combinators** (no regex line-grammar, no hand-rolled character scanning left
  driving the block/inline parse); zero `as` / `any` / `ts-ignore`; no new
  runtime deps (plgg-parser is already a dependency).
- **All existing plgg-md specs stay green** and coverage stays **>90%** on the
  package's pure core (the parser files are the core — they must be exercised).
- **Byte-identical rendered output**: the guide + strategy corpora rendered
  through the new parsers are **identical** to the golden baseline captured before
  the change (empty `diff` over `dist` HTML), and any plgg-md golden/snapshot
  spec added in step 1 passes unchanged.
- The public API (`renderMarkdown`, `renderMarkdownWithOptions`, `parseBlocks`,
  `renderInline`) is unchanged; `renderMarkdown.ts` orchestration untouched.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` and `packages/plgg-md`'s `plgg-test src --coverage` green.
- Golden diff: build guide + strategy before (HEAD) and after; `diff -r` the two
  `dist` HTML trees → **no output**.
- `scripts/check-all.sh` green (every downstream consumer renders through
  plgg-md).

**Gate** — what must pass before approval:

- All of the above, with the **byte-identical golden diff empty** as the hard
  gate: if a single rendered byte differs, the rewrite is not equivalent and is
  not done (unless the developer explicitly signs off on a specific difference as
  a pre-existing bug). Passing specs alone is NOT sufficient — the golden diff
  over the real corpora is the arbiter.

## Findings from the first drive attempt (2026-07-14)

A drive session did step 1 (the oracle) and the full design work, then stopped
before writing parser code rather than leave plgg-md half-swapped. **Start here —
do not re-derive any of this.**

### The oracle is DONE and validated (step 1 is complete)

- **In-repo golden spec landed: `packages/plgg-md/src/Render/usecase/golden.spec.ts`**
  (commit `e827154e`). It pins the EXACT rendered HTML (1545 bytes) for a corpus
  covering the bounded subset plus the reimplementation traps, and its expected
  bytes were generated from the real parser and machine-compared, not hand-written.
  **This is the fast inner-loop gate** — run `scripts/test-plgg-md.sh` after every
  step of the rewrite.
- **It was trip-tested and it bites.** Loosening strong's empty-content guard
  (`close > i + 2` → `>= i + 2`) is caught by this spec ALONE while all 104 other
  specs stay green. Corollary: the pre-existing suite does NOT protect the parser's
  edge behavior — passing the old specs is worthless as an equivalence signal.
- **The site-level build is deterministic**, so the ticket's `diff -r` gate is
  sound: guide (39 pages) + strategy (4 pages) rebuilt from an unchanged tree
  produced byte-identical trees. Keep it as the FINAL gate; golden.spec.ts is the
  inner loop.
- **`diff` is aliased to nvim in this shell** — `diff -r a b` silently runs an
  editor and a naive `&& echo ok` reports a false pass. Use `command diff`.
  Likewise `noclobber` is on (`>|` to overwrite) and `cp` is `-i`.

### The traps that will break a naive rewrite (all measured, all pinned)

- **Literal runs must MERGE.** `renderInline` accumulates unmatched chars in one
  buffer and flushes them as a SINGLE `Text` node — `a*b` is `Text("a*b")`, not
  three nodes. `many(or(token, anyChar))` produces per-char nodes and changes the
  AST. Parse to a piece list (node | char), then fold, merging char runs and
  reproducing the newline rules (`\`/two-space → hard break; otherwise append a
  space to the buffer). The fold is not "scanning" — the combinators drive; the
  fold only assembles.
- **`****` must NOT strong.** The guard is `close > i + 2` (strictly), so empty
  `**…**` falls through to emph, then to literal. Use `many1`, never `many`, for
  strong/emph content.
- **`*a **b** c*` renders as THREE sibling `<em>`s**, not `<em>` wrapping
  `<strong>` — emphasis grabs the first following star. Reproduce, do not "fix".
- **Code spans close on a MAXIMAL run of exactly n ticks.** `findCodeClose` skips
  runs of the wrong length WHOLE. A naive `notFollowedBy` closer matches inside a
  longer run (for n=1, ``` ``x` ``` would wrongly close at the 2nd tick). Content
  must consume tick-runs atomically: `many(or(runWithLengthNotEqualN, noneOf("`")))`,
  then `literal("`".repeat(n))`.
- **JS `\s` ≠ plgg-parser's `whitespace`.** `IMAGE_RE`/`LINK_RE`'s `[^)\s]` uses
  JS `\s` (Unicode: `\v`, `\f`, ` `, ` `, …); plgg-parser's `whitespace`
  is only space/tab/`\n`/`\r`. Use `satisfy` with an exact predicate, or exotic
  URLs diverge.
- **`htmlSpan` emits the source token VERBATIM**, so the combinator must rebuild
  the consumed text exactly. Concatenating the consumed parts works (nothing is
  normalized). The regex's lazy `[^<>]*?` and a greedy `many(noneOf("<>"))` yield
  the SAME total span (`>` can't be inside), so greedy is safe.
- **The ticket's own prose overstates the grammar**: `renderInline` has **no
  autolinks and no general backslash escapes** — `\` matters only for hard breaks.
  The CODE is the spec, not this ticket's Overview.
- **Fallthrough order is load-bearing**: newline → image → link → rawHtml → code →
  strong → emph → literal char. A PEG `or` chain in exactly that order reproduces it.

### Step 2 is DONE: the inline parser is swapped and byte-identical

`renderInline.ts` is now a plgg-parser grammar (commit `0b948549`), with the
regexes gone and the public API unchanged. It passed the hard gate: guide +
strategy rebuilt through it diff EMPTY against the baseline, and the gate was
itself proven live (breaking the soft-break rule moved 505 diff lines, so the
empty diff is not a stale-dist false pass). **Read it before writing the block
parser — it is the worked example of every technique below.** Remaining: step 3
(the block grammar).

### The block parser is a DIFFERENT problem — read this before starting

plgg-parser is **character-level**: `run(parser, source, userState)` takes a
string and `satisfy` reads `state.source[state.position]`. `parseBlocks` is
**line-level** (`source.split("\n")`, a cursor over lines, look-ahead at line
`i+1`). There is no line abstraction to borrow — the block grammar must be
re-expressed as a char grammar with explicit end-of-line handling
(`restOfLine = many(noneOf("\n"))`, an `eol = or(char("\n"), eof)`), or a
line-level layer must be built first. **Decide that shape before writing code**;
it is the ticket's real open design question, and it is why step 3 is bigger than
step 2 despite both being "swap a parser".

Specific traps beyond the inline ones:

- **Quote and container RE-PARSE a TRANSFORMED source, not a substring.**
  `takeQuote` strips each line's `> ` prefix and runs `parseBlockLines` over the
  *rebuilt* body; `takeContainer` slices the inner lines and recurses. So the
  recursion is "extract text → rebuild a source → call `parseBlocks` on it" —
  exactly the shape inline's `strong`/`emph` use (extract body, recurse via
  `renderInline`). Reuse it; do not try to sub-parse the original state.
- **The container tracks a colon-count STACK** — any `:{3,}` opener pushes, a
  close pops only on an EXACT count match, and a wrong-length close is a hard
  `mismatch` error distinct from `unterminated`. Both messages are part of the
  contract (they are `invalidError` payloads callers can see).
- **Table detection needs line `i+1`**: a line only starts a table when it holds
  a `|` AND the NEXT line matches `TABLE_SEP_RE`. That is `lookahead` over the
  rest of the current line plus a newline plus the separator line.
- **`HEADING_RE`'s `(.*?)` is LAZY and interacts with the trailing `#*`**:
  `# Hello ###` → text `Hello` (the tail eats ` ###`), but `# Hello #x` → text
  `Hello #x` (the tail cannot match `x`). Lazy-until-tail is
  `many(right(notFollowedBy(tail), anyChar))` then `tail`, where
  `tail = [ \t]* #* [ \t]* eol`. The same shape covers every lazy group.
- **Fence close must share the opener's CHARACTER** (` ``` ` is not closed by
  `~~~`) and the info string is captured verbatim; an unterminated fence is a
  failure, not a paragraph.
- **The top-level branch order is the grammar** and must be reproduced exactly:
  blank → fence → container → heading → thematic break → quote → table (with the
  `i+1` lookahead) → html block (rawHtml only) → list → paragraph.

### DECIDED (developer, 2026-07-15): re-express the block grammar as a CHAR grammar

Asked directly, the developer chose **"文字文法として書き直す"** — re-express the
whole block grammar as a character-level PEG with explicit end-of-line handling
(`restOfLine`, `eol = or(char("\n"), eof)`), using plgg-parser as-is. Do NOT build
a line-level layer over plgg-parser, and do not change `Parser<A,S>`'s source
abstraction. The known cost, accepted: a line grammar written as a char grammar
may read worse than the original — that trade was made deliberately.

### The rest of the block anatomy (read, not yet ported)

Everything below is measured from the current code and must be reproduced exactly.

- **`parseListAt` is the hardest piece.** Per level: a **continuation** line
  (marker-less, non-blank, `indentOf > baseIndent`) appends to the PREVIOUS item's
  text joined by a single space (`` `${last.text} ${line.trim()}` ``) — note the
  raw line is `trim()`ed. A **deeper-indent** marker recurses and the resulting
  list is pushed into the previous item's `children` (a nested list is a CHILD of
  the item above it, not a sibling). A **shallower-indent** marker breaks the
  level. `ordered` is decided by the **first** item at that level only; later
  items cannot flip it. A continuation or nested item with NO previous item breaks.
- **`takeParagraph` checks `startsBlock` only from the SECOND line on**
  (`j > i && startsBlock(...)`) — the first line is taken unconditionally, which is
  what lets an out-of-subset line start a paragraph even though it would otherwise
  look like a block opener. Reproduce that asymmetry.
- **`startsBlock`** is the disjunction fence | container-open | heading | hr |
  quote | list | (rawHtml && html-open) | (`line.includes("|")` && next line is
  `TABLE_SEP_RE`). It is the paragraph terminator AND mirrors the top-level order.
- **`takeHtmlBlock`** takes the opener plus every following non-blank line to a
  blank line or EOF, verbatim.
- **`takeTable`**: the alignment row's cell count must equal the header's or it is
  a `Malformed table: N alignment cells for M header cells` error; body rows
  continue while the line merely `includes("|")`. `splitRow` = `trim()`, strip one
  leading `|`, strip one trailing `|`, `split("|")`, `trim()` each cell — so
  `| a | b |` and `a | b` both give `["a","b"]`. `parseAlign`: both colons →
  center, trailing → right, leading → left, else default.
- **Error messages are contract**: `Unterminated code fence opened with '…'`,
  `Mismatched container fence: …`, `Unterminated container '…' opened with N colons`,
  `Malformed table: …`. They are `invalidError` payloads, and `parseBlocks` returns
  `Result` — the first error WINS and stops the scan (the loop `break`s).
- `asHeadingLevel` can fail, so `takeHeading` returns a `Result` — keep that path.

### Combinator surface notes

- Available: `char literal satisfy anyChar noneOf oneOf letter alphaNum digit
  whitespace many many1 between sepBy sepBy1 or optional lookahead notFollowedBy
  lazy map andThen seq right left succeed fail eof run getUserState setUserState`.
  **No `manyTill`** — emulate with `many(right(notFollowedBy(closer), anyChar))`.
- `run(parser, source, userState): Result<A, InvalidError>`;
  `between<O,C,S>(open, close)<A>(inner)`; `andThen` is data-last
  (`pipe(p, andThen(f))`); `matchResult(onErr, onOk)`.
- **Coverage watch-out**: `renderInline` returns a bare array, but `run` returns a
  `Result` whose Err branch is unreachable by construction (the piece parser
  always succeeds). Unfolding it with a fallback creates exactly the dead
  defensive branch the coverage guidance warns about — decide this deliberately.
- Internal source uses self-subpath imports (`plgg-md/Inline/model/Inline`) which
  bare `node` cannot resolve; only plgg-test maps them. To run ad-hoc scripts,
  import the built barrel (`plgg-md`) instead.

## Considerations

- **Reproduce, don't "improve".** The combinator form will tempt cleanups that
  change edge-case output (whitespace, ambiguous fallthrough, malformed input).
  The gate is byte-identical — resist grammar "fixes" here; if a genuine bug is
  found, note it for a SEPARATE ticket rather than folding a behavior change into
  this equivalence swap.
- **PEG ordered choice ≠ regex alternation order automatically** — the current
  parser's branch order (e.g. raw-HTML-block before paragraph, fence before list)
  encodes precedence; the combinator `or` chains must reproduce that exact order,
  and plgg-parser is PEG/stateless-backtracking (no `attempt`) so lookahead/
  `notFollowedBy` may be needed where the regex peeked.
- **Concrete-`S` pinning**: follow `parseYamlSubset.ts` and pin the user-state
  type (`null`) unless a case genuinely needs state; don't leave `S` generic.
- **Coverage shape**: the parser files ARE the >90% pure core — keep the spec
  suite exercising every block/inline branch; the combinator rewrite must not
  introduce uncoverable defensive branches (see the coverage-vs-isErr guidance).
- **Downstream blast radius**: plggpress `pressRouter.ts` and the dead-link
  checker call `renderMarkdownWithOptions`; the guide/strategy/every site render
  through it — which is exactly why the golden diff over the real corpora, not
  just unit specs, is the gate.
- **Scope is both parsers in one ticket** (developer decision); the front-matter
  YAML parser already uses plgg-parser and is out of scope (leave it as-is).
