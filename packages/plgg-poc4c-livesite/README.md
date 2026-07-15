# plgg-poc4c-livesite

> PoC 4c of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — **watchable edits on the REAL rendered
> site**. The document pane is the actual plggpress-rendered page (its
> markup, its styling, its hot reload), proxied — and when the assistant
> edits it, the changed span erases and rewrites itself IN PLACE: no
> reload, the Realtime session unbroken, the file correct on disk.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

## The question

**Does the granular, animated in-place edit PoC 4b proved survive contact
with the REAL rendered site — a full plggpress page with its own markup,
styling and hot reload — rather than a purpose-built preview surface?**

Confidence signal: asking the assistant to change the open document
animates the edited span in place **on the real rendered page**, with no
full-page reload, the Realtime session unbroken, and the file on disk
correct afterwards.

Two shipped PoCs each proved one half, and neither has both:

- **[PoC 4](../plgg-poc4-edit/README.md)** (`proven`, mechanics) serves the
  real site, but an edit arrives as a **page reload**: you see the
  *result*, never the *change*.
- **[PoC 4b](../plgg-poc4b-coedit/README.md)** (`proven`, experience) makes
  the change **watchable** — and live judging chose the micro-animation
  over the before/after diff — but on a **preview surface it owns**.

4c is the synthesis. It carries 4b's animation forward unchanged in
spirit; the open question is only whether it survives on a page this
program does *not* own.

## What is actually new here

4b's core is REUSED, not re-derived ([`src/poc4b.ts`](src/poc4b.ts) is a
relative source seam onto it): the granular `{find, replace}` model, the
exactly-once span locator, the applier, the diff, the path guard, the
wire casters, and the Realtime loop's pure half. Two surfaces are new,
and they are where the PoC lives:

### 1. Reaching into a page we do not own — [`src/spanMap.ts`](src/spanMap.ts)

4b patched a plgg-view tree it rendered. Here the page comes from the
internal plggpress dev server and is proxied, so there is no view tree to
key and the shell cannot touch it from outside. The way in is a client
**injected into the proxied HTML** ([`src/inject.ts`](src/inject.ts)
rewrites each page; [`src/patchClient.ts`](src/patchClient.ts) is what
runs there), driven over the iframe boundary by
[`src/bridge.ts`](src/bridge.ts).

The hard part is that **the markdown span and the DOM span are not the
same text**. `spanMap.ts` is the one authority on whether an edit can be
pointed at rendered text, and it is pure — it takes the edit and the
page's text runs as values and returns a located hit or a typed refusal.

The correctness crux is the ORDER: the text is **rendered first and
narrowed second**. The obvious opposite — narrow the markdown with 4b's
`refineChange`, then render — is quietly dangerous. Take a markdown link
labelled `docs` whose target changes from `/old` to `/new`: narrowed as
raw markdown it reduces to `old`→`new`, a span living inside a URL. If the
prose happens to contain the word "old" once, the writer would watch the
*wrong word* change while the link changed on disk. Rendering first makes
every anchor real rendered text by construction — both sides render to
`docs`, so the edit is refused as `MarkupOnly` instead. (Pinned by a
regression test.)

### 2. Arbitrating the hot reload — [`src/reloadPolicy.ts`](src/reloadPolicy.ts)

The dev server watches `content/`, and the agent's edit IS a write to
`content/` — so every landed edit pushes a reload frame that would blow
the patch away mid-animation. It cannot be fought from outside either:
`location.reload()` is called by a script we do not control, and
`window.location` is unforgeable.

So the reload is **replaced, not suppressed**. The proxy swaps the dev
server's live-reload script (the literal imported from plgg-bundle's own
protocol module, so it cannot drift) for our injected bundle, which opens
the *same* stream and honours the same frames under a policy:

> **Absorb the reload our own edit caused; let every other reload
> through.**

An edit that could not be mapped releases the reload instead — the edit is
on disk, and the reload is the only honest thing left. **The fallback IS
PoC 4**, which is why an unmappable edit is a reported gap and not a
failure. A reload from the developer's own editor still lands, so PoC 4's
recorded hot-reload verdict keeps holding.

### Narrow, but not too narrow

Refining makes the animation crisp, but it can narrow TOO far. Measured on
the real guide render, this was the single biggest cause of a
fallback-to-reload: `## Option, not null` → `## Option, never null`
refines to the *fragment* `ot`→`ever`, and `ot` recurs all over a page
("not", "other") — so the crisp anchor refuses itself as ambiguous even
though the heading is perfectly locatable at full width.

So the narrow anchor is a **preference, not a commitment**: when it cannot
be located, the full rendered span is tried, which is longer and far more
likely to be unique. Crispness where possible, a watchable change where
not, a refusal only when neither width works.

## Measured on the real guide render

Eleven realistic edits mapped against the actual proxied page's text runs:

| Result | Cases |
| --- | --- |
| **Mapped** (animates in place) | 8 — heading reword (the developer's own example), a word inside a paragraph, a phrase spanning a sentence, an insertion, a deletion, a lower heading, a link's label, text beside a link |
| **Refused** `MarkupOnly` | 3 — a link's target only, emphasis added around an existing word, a heading's level only |

Every refusal here is *correct*: in all three the rendered words are
identical, so there is genuinely nothing to animate and the reload is the
honest answer. Before the widening fallback above, 5 of 11 mapped; the
three extra failures were all the too-narrow-anchor case.

## What does NOT map (measured, not guessed)

Every one of these is a typed refusal, surfaced on the page with its
reason and degraded to a reload. They are the honest half of the result.

| Refusal | The edit | Why it cannot animate |
| --- | --- | --- |
| `MarkupOnly` | `cat` → `**cat**`, or a link whose target changes while its label does not | The rendered words are identical. Nothing on the page changes; only a re-render shows it. |
| `EmptyRendered` | `## ` → `### ` | The edited text is structure that renders to no visible text. There is nothing to erase. |
| `BlockSpanning` | a change that still carries a newline after narrowing | It crosses block elements, so no single contiguous rendered span represents it. (A wide `find` that merely *spans* blocks while changing one word inside one of them is fine — narrowing rescues it.) |
| `NotInDom` | the rendered span is split across inline elements (`the **cat** sat`, edited as `cat sat`), or the renderer transformed the text | The page holds three separate text runs; no run reads "cat sat". **This is the biggest real gap** — the mapper is text-run-local by design, because that is what makes exactly-once mean anything. |
| `AmbiguousInDom` | the rendered text occurs more than once in the prose column | An ambiguous match must never silently pick the first, or the writer watches the wrong word change. |

Two further honest notes:

- **The animation is re-implemented, not reused.** 4b's motion rode
  plgg-view's `transition` + keyed reconciliation; that seam does not
  reach a page plgg-view never rendered. The *choreography* (erase, dwell,
  write) and the tuned `REVEAL_MS` carry over; the mechanism is raw DOM.
- **The walk is scoped to the prose column** (`.vp-doc`), not the body.
  The theme also renders the sidebar tree and the footer, so a heading
  exists two or three times in the document — body-scoped, nearly every
  heading edit would refuse itself as `AmbiguousInDom`.

## Architecture

Two processes in one container (PoC 4's, kept):

1. the **internal plggpress dev server** (`plgg-bundle dev`, :5175)
   rendering the seeded corpus copy with real hot reload;
2. the **shell server** ([`src/entrypoints/serve.ts`](src/entrypoints/serve.ts),
   :5173 → host 5198) carrying the session page, the mint + edit seams,
   and the **injecting** `/docs/*` + `/__plgg_reload` proxy.

The shell page is never served by the dev server: its injected
`location.reload()` would tear down the WebRTC session. In the proxy, HTML
is buffered and rewritten while **everything else streams raw** — the SSE
reload stream above all, since buffering it would starve the injected
client of the very frames it arbitrates.

Two bundles come out of `npm run build`: `dist/main.js` (the shell client)
and `dist/patch.js` (the injected one).

## Run it

```sh
scripts/serve-poc.sh poc4c-livesite   # → http://localhost:5198
```

`OPENAI_API_KEY` comes from the ONE git-ignored `.env` at the repo root;
without it the PoC serves its honest "assistant not configured" state. The
agent edits a git-ignored COPY of the guide corpus (`content/`, seeded from
`packages/guide`); `npm run reset-content` re-seeds it.

The `plgg-poc4c.qmu.dev` cloudflared ingress route is developer-applied:

```yaml
  - hostname: plgg-poc4c.qmu.dev
    service: http://localhost:5198
```

## Offline gates

```sh
scripts/test-plgg-poc4c-livesite.sh   # tsc --noEmit && plgg-test src
```

The >90% gate covers the pure core: the span mapping and its refusals, the
reload arbitration, the HTML rewrite, the wire casters, the route mapping,
and the TEA reducer. The injected DOM edge, the effects, the view, the
vendors and the entrypoints are excluded (see `plgg-test.config.json`) —
every DECISION they act on comes from the tested modules.
