---
created_at: 2026-07-14T20:22:39+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash: c2f08ce4
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
