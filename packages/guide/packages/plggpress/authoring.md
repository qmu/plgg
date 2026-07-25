# Authoring: columns, and editing by voice

Two things are true of a [plggpress](/packages/plggpress)
site that are not true of most documentation generators:
the reader navigates it as a **horizontal strip of
columns**, and the writer can edit it **by talking to it**.

This page is about both — what you see, and the one
command that gets you there.

## The column-oriented layout

plggpress renders its documentation navigation through
[plggmatic](https://github.com/qmu/plgg), the family's
horizontal-orientation UI framework, rather than through a
sidebar-and-body shell of its own.

The property that follows from it: **depth does not consume
the viewport.** Drilling into a section opens its content as
a new column to the _right_ instead of replacing the body,
so the path you took stays visible beside where you landed.
The top bar and the body width do not move as the strip
grows; the strip itself scrolls horizontally underneath
(`overflow-x: auto` on the row, not on the page).

That is the wide-viewport shape. Below the large breakpoint
the strip collapses to ordinary page flow with a sticky
mobile bar and an off-canvas drawer, so a phone gets a
normal document rather than a strip it has to drag.

The aesthetic is qmu.co.jp's: pure monochrome, with the
beauty carried by spacing and layout rather than by colour.
It is not hard-bound — the theme is a `SiteConfig` field, so
a site chooses or overrides it at its own composition root
rather than inheriting whatever plggpress ships.

## The dev loop

```sh
npx plggpress dev
```

That is the whole setup. In a docs repo whose only
dependency is plggpress, `dev` finds your content
(`docs/` when the repo has one, the working directory
otherwise; `--contentDir` settles the rest), loads
`site.config.ts`, and serves the **same render path**
`plggpress build` uses — so what you are looking at is what
will be built.

It is a persistent server plggpress owns, not a one-shot
render: it holds a live-reload channel of its own for its
whole lifetime, so editing a source file updates the page
without dropping that channel.

| Flag | What it does |
| --- | --- |
| `--contentDir <path>` | The content root to serve. |
| `--config <path>` | The `site.config.ts` to load. |
| `--port <n>` | The port to bind (default 5173). |
| `--host <name>` | An extra `Host` header to accept (a tunnel domain). |
| `--watch-theme` | Also watch plggpress's own source, for co-developing the theme. |

`dev` is for authoring, not hosting. Production is
`plggpress build` onto a CDN.

## Editing by voice

Set `OPENAI_API_KEY` before starting `dev` and every page
gains a small panel in the corner:

```sh
OPENAI_API_KEY=sk-… npx plggpress dev
```

Press **Talk about this page**, allow the microphone, and
you are in a conversation with an assistant that is looking
at the same document you are. Ask it to tighten a paragraph,
rename a heading, or delete a stale sentence, and the change
lands in your markdown file — while you keep talking.

What happens underneath, in the order it happens:

1. **The page asks whether the assistant is available at
   all.** No key on the server means no panel is drawn —
   you are never offered a button that could only fail.
2. **The server mints a short-lived key.** Your standing
   `OPENAI_API_KEY` never reaches the browser: the dev
   server exchanges it for an ephemeral OpenAI Realtime
   client secret and hands over only that grant.
3. **The session is grounded in the open document.** The
   browser reports the _route_ it is on; the server resolves
   it to the `*.md` behind it through the render path's own
   route→file mapping, reads it, and quotes it into the
   session instructions. The assistant therefore reads
   exactly the file the page was rendered from.
4. **An edit is one exact span.** The assistant's `edit_doc`
   tool takes a `find` copied verbatim from the document and
   the `replace` it becomes — never a whole-file rewrite. It
   carries no path: the file is fixed by the server for the
   whole session, so the model chooses _what_ to change and
   never _where_.
5. **The edit goes through the live-edit bridge.** The same
   one a tool call has always used: it authorizes the path,
   applies the located span, and writes atomically, so a
   reader never sees a torn file. A refusal comes back with
   a named reason, which the assistant hears and can retry
   against.
6. **The page updates in place.** Normally a source change
   reloads the browser — but a reload destroys the page's
   JavaScript context, and with it the live connection. So
   while a session is running the reload is _arbitrated_:
   the page re-fetches itself and swaps the new content in,
   leaving the conversation connected. Close the session and
   ordinary hot reload resumes.

### What it costs you if you do not want it

Nothing. With `OPENAI_API_KEY` unset there is no panel, no
client script in the served HTML, and no mint route —
`plggpress dev` behaves exactly as it did before the
assistant existed. The whole surface is dev-only: a
`plggpress build` output contains none of it, because a
static site has no writable seam to offer.

### Where the key lives

Server-side, and only there. Put it in your shell or a
git-ignored `.env` you source before `dev`; never in
`site.config.ts`, which is committed and is read by `build`
as well.

### Run it on a machine you trust

`dev` is an authoring tool, and it assumes the network around
it is yours: it binds **all interfaces**, not just loopback,
and neither the patch route nor the voice-mint route asks who
is calling — no authentication, no `Origin` check, no
required content type. Anyone who can reach the port can edit
your content files and spend your OpenAI quota. The path
guards still hold (edits stay inside the content root, and
`.md` only), so this is exposure of your working copy rather
than of your filesystem — but keep the port to your own
machine or a trusted tunnel, and remember that production is
`plggpress build` onto a CDN, which has none of these routes.
