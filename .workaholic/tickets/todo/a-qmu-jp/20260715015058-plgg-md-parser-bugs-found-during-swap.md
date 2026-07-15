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
