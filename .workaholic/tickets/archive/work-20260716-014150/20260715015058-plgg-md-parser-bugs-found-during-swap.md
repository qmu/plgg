---
created_at: 2026-07-15T01:50:58+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission:
---

# Fix the plgg-md grammar bugs surfaced (and deliberately preserved) by the combinator swap

## RESOLUTION (2026-07-16): all five closed — 2 and 3 fixed, 4 fixed as a DIALECT choice, 5 not actionable

Developer authorised all four remaining on 2026-07-16. Each landed as its own
commit with its own site gate, per this ticket's "decide per bug, do not batch".

- **2. Fence closer length — FIXED** (`ba5dfeed`). `fenceCloseLine` now requires
  `close.length >= marker.length` as well as the same character (CommonMark §4.5).
- **3. Container colon scan — FIXED** (`d5f13a81`). A complete fenced block is now
  consumed whole by `fencedRegion` before any line is classified, so colons in a
  code sample are body. An UNTERMINATED inner fence deliberately keeps the old flat
  reading, so the existing "Unterminated code fence" spec still passes untouched.
- **4. Table rows — FIXED, but it is NOT a bug fix** (`c7f565e9`). See below.
- **5. Unreachable paths — NOT ACTIONABLE.** See below.

### Two corrections to this ticket, both found by measuring

**The re-pin warning did not hold.** This ticket states each remaining bug "will
fail `golden.spec.ts` on purpose" and needs a deliberate re-pin. **None of them
did.** Golden stayed green through all three fixes, because its corpus never
exercised any of the paths: it has only 3-tick fences, a plain callout (never one
wrapping a fenced sample), and table rows that all lead with a pipe. The warning
is a sound general caution, not a per-bug fact — re-pinning something golden never
covered would have been noise. The **site gate** (guide + strategy rebuilt, both
exit 0, `command diff -r` vs a pre-fix baseline) was EMPTY for all three, which is
what actually confirms the corpora were untouched.

**Bug 4's premise was wrong — it was measured against the wrong oracle.** This
ticket says the findings were "verified against the original regex implementation,
not speculation". True, and that is exactly the gap: verified against plgg-md's own
predecessor, never against markdown-it, which is what VitePress renders with and
what this guide was migrated FROM. Measured directly:

| case | markdown-it (VitePress) | plgg-md before the fix |
|---|---|---|
| table + **pipe-bearing** paragraph | swallows it (3 rows) | swallows it (3 rows) — **agreed** |
| table + plain paragraph, **no pipe** | swallows it (3 rows) | stops (2 rows) — diverged |
| table + blank line | stops | stops |
| table + heading | stops | stops |

So on this ticket's exact complaint plgg-md **already matched VitePress**: GFM
breaks a table only at a blank line or another block construct, and prose is
neither. The only real divergence was the opposite one. The developer was shown
this and chose to fix it anyway, as a **deliberate dialect divergence**: plgg-md
renders a bounded authored subset, and there a paragraph joining the table above it
is never what the author meant. The cost — pipe-less GFM rows (`1 | 2`) are now
prose — is pinned by a spec, and the reasoning lives in `tableBodyLine`'s doc so it
is not "restored to GFM parity" later as if it were an oversight.

### Why 5 is not actionable (all three, individually)

- **`takeParagraph`'s first-line asymmetry** — the name no longer exists. The
  combinator swap replaced it; the post-swap `paragraphBlock` carries the asymmetry
  as STRUCTURE (`nonBlankLine`, then `many(notFollowedBy(startsBlock))`), not as a
  branch that can be deleted.
- **`asHeadingLevel`'s error path** — must stay. It is a public `asX` caster
  exported through the barrel, its error path is directly spec'd
  (`Block/model/Block.spec.ts:44,47`), and it is reachable by any consumer. It is
  unreachable only *from `parseBlocks`*. Deleting it would also force a `number` →
  `HeadingLevel` cast at the call site, which the no-escape-hatch rule forbids.
- **`parseListAt`'s guard** — the name no longer exists either; the equivalent is
  `listNest`'s `matchOption(() => fail("a preceding list item"), …)`. That branch
  IS dead (every path builds `listLevel(mark.indent, [], …)`, so the base equals the
  first mark's indent and `items` is never empty when `listNest` runs). But it
  **cannot be deleted**: `items[items.length - 1]` is `possibly 'undefined'` under
  `noUncheckedIndexedAccess` (verified — TS18048), so the guard is forced by the
  type system. Removing it needs `as`/`!`, which CLAUDE.md prohibits outright.

The premise "deleting changes no behavior but does move coverage" also no longer
holds on its own terms: `Block.ts` and `parseBlocks.ts` both report 100%, and the
package clears the >90% branch gate. There is nothing to gain and a rule to break.

## STATUS (2026-07-15): bug 1 (CRLF) FIXED — four remain, each still needing a call

The developer approved starting on the parser bugs but did not name one, so **only
bug 1 was done** — the ticket's own ranking calls it the highest real-world impact
and "almost certainly unintended", and the ticket says to decide per bug rather
than batch. It turned out to be the safe one: because `\n`-only sources are passed
through untouched, it changed NOTHING that renders today (golden green, corpora
diff empty), so it needed no golden re-pin at all.

**The remaining four are NOT like that** — each genuinely moves rendered output and
will fail `golden.spec.ts` on purpose, so each needs its own sign-off:

- **2. fence closes on the same character regardless of length** — changes how
  documents that embed fences render; the guide has many.
- **3. the container's colon scan is flat** — a `:::` inside a fenced block inside a
  callout closes it early.
- **4. table rows continue on any line containing `|`** — swallows a following
  paragraph.
- **5. three unreachable paths** — deleting them changes no behavior, only coverage.

Say which, and each is a small change with a deliberate re-pin.

## Overview

Porting plgg-md's parsers onto plgg-parser was a **pure equivalence swap** — the
gate was byte-identical output, so every quirk had to be reproduced exactly,
including the wrong ones. The port is done (`0b948549` inline, `db03ae5b` block)
and byte-identical; this ticket is where the **real bugs it exposed** get decided
on their own merits, one at a time, each re-pinning `golden.spec.ts` deliberately.

These are all **current, shipped behavior** — verified against the original regex
implementation, not speculation. None is urgent: the corpora we render
(`packages/guide`, `../strategy/docs`) do not trigger them today, which is exactly
why they survived unnoticed.

**Each fix is a BEHAVIOR CHANGE.** The gate that protects the parser
(`golden.spec.ts`) will fail on purpose. Re-pin it deliberately, per bug, with the
developer's sign-off — never by "fixing the expectation to make the suite green".

## Findings (each independently verified)

1. ~~**A CRLF source parses as nothing but paragraphs.**~~ **FIXED** (developer-
   approved 2026-07-15). JS's regex `.` excluded `\r`, so no block construct
   matched at all on CRLF input — measured before the fix:
   `# Title\r\n\r\n- a\r\n- b\r\n` rendered as
   `<p># Title</p><p>- a - b</p>`, versus `<h1>Title</h1><ul><li>a</li>…` for the
   same document with LF. `normalizeLineEndings` now folds CRLF and lone CR to LF
   at the two public entries (`parseBlocks`, and `renderMarkdownWithOptions` —
   frontmatter split on `\n` too, so it broke identically). CRLF and lone-CR
   documents now render byte-identically to their LF twins, and specs pin it.
   A `\n`-only source is returned untouched, so **nothing already rendering moved**:
   golden green and the guide + strategy corpora diff EMPTY.
2. **A fence closes on the same character regardless of run length.**
   `sameFenceRun` compares `charAt(0)` only, so a ` ```` ` fence is closed by a
   ` ``` ` — CommonMark requires the closer to be at least as long. Verified:
   `sameFenceRun("````", "```") === true`. This breaks the standard idiom of using
   a longer fence to embed a shorter one.
3. **The container's colon scan is flat, not nesting-aware.** A `:::` inside a
   fenced code block inside a container still pops the stack, so a callout
   containing a code sample that shows `:::` syntax closes early.
4. **Table body rows continue on any line merely containing `|`.** A following
   paragraph that happens to hold a pipe is swallowed as a table row.
5. **Three unreachable paths** (reproduced anyway, as contract/defensive):
   `takeParagraph`'s first-line asymmetry is dead at top level (every
   `startsBlock` alternative is tried first); `asHeadingLevel`'s error path cannot
   fire (`#{1,6}` caps the level); `parseListAt`'s "deeper marker with no previous
   item" guard cannot fire (the first line's indent defines the base). Consider
   whether to delete or keep them — deleting changes no behavior but does move
   coverage.

## Considerations

- **Decide per bug, do not batch.** Each has a different blast radius, and #1 and
  #2 are the only ones with a plausible real user. Batching them makes the
  golden re-pin unreadable.
- **`golden.spec.ts` must be re-pinned from the real parser**, never hand-edited —
  generate the expected bytes and machine-compare, the way the pin was built.
- **Re-run the site gate after any fix**: `command diff -r` over the rebuilt guide +
  strategy against a fresh baseline. Note `diff` is aliased to nvim here — a naive
  `diff` reports a false pass. Also: **a failed site build leaves `dist` stale, so
  the diff passes for the wrong reason** — always check the build's exit code
  before trusting an empty diff.
- Fixing #1 or #2 may change `plgg-highlight`'s or plggpress's rendering of docs
  that embed fences; the guide's own pages are the first place to look.

## Related

- `20260714202239-plgg-md-parsers-onto-plgg-parser.md` — the equivalence swap that
  surfaced these; its Findings section carries the parser anatomy.
- `packages/plgg-md/src/Render/usecase/golden.spec.ts` — the oracle that will fail
  (correctly) on each fix.
