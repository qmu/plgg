# plgg-poc4b-coedit

> PoC 4b of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — **live co-editing preview: the change
> happens ON the preview**. The assistant edits GRANULARLY (a small
> find/replace), and the changed span lands on a live, patchable preview —
> it erases and the new text writes in, or shows a before/after diff
> (toggleable) — with NO page reload, the same Realtime session (voice
> **and** typed text) talking throughout.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

PoC 4 proved the MECHANICS (an agent edit lands on disk, the page
refreshes, the Realtime session survives). PoC 4b answers the EXPERIENCE
question the mission actually needs: does it feel like standing at the
same whiteboard, the AI erasing and adding text in place? The PoC 4 build
could not deliver that feel for two structural reasons, and 4b changes
both:

1. **Whole-file replacement → GRANULAR edits.** PoC 4's
   `edit_file(path, whole_content)` regenerated the entire document. 4b's
   `edit_doc(path, edits)` emits `{find, replace}` operations — each
   `find` must match the document exactly once — so a change is a small,
   addressable, watchable delta. The applier, the span locator, and the
   diff builder are pure total functions (`src/edit.ts`), exhaustively
   spec'd.
2. **Reloading iframe → a LIVE, PATCHABLE preview.** PoC 4's doc pane was
   a plggpress-rendered iframe that `location.reload()`s. 4b RETIRES it:
   the shell renders the document as prose and patches only the changed
   region in place — no full reload, so the shared surface never vanishes.
   (Losing plggpress theming is an accepted PoC trade-off — the point is
   the change animation, not the chrome.)

On the preview the change is visualized **two ways, toggleable and judged
side by side** — both driven by the SAME pure diff, never a re-render
heuristic:

- **Micro-animation** — the old span fades/strikes out and the new text
  writes in with a highlight (the "watch the hand move" co-presence feel),
  built on plgg-view's declarative Web-Animations seam + keyed
  reconciliation.
- **Before / after diff** — the changed span shown inline as old (struck)
  vs new (highlighted) (the "here is what I changed, confirm it" feel).

The write path keeps PoC 4's layered guard (defense-in-depth):
`POST /api/edit` validates the body inward (`unknown` → `asEditRequest`),
the pure `resolveEditPath` (`src/editPath.ts`) authorizes the path
(relative only, no traversal, `.md` only — exhaustively spec'd), the fs
boundary re-checks realpath containment (symlink escape), the ops apply
via the pure `applyEdits` (only the located spans change, never a
whole-file rewrite), and the write is temp+rename so a reader never sees a
torn file. The reply carries the new text plus the diff segments the
client renders, so preview and disk agree. After a landed edit the serve
process rebuilds its in-memory FTS index and the browser refetches it —
the next `search_docs` sees the new text.

Both writer input paths share one session: the microphone from PoC 3,
plus a typed turn over the same data channel — no second mint. The
standing `OPENAI_API_KEY` stays in the serve process behind
`POST /api/session` (honest 404 without it).

## Commands

- `npm run seed-content` / `npm run reset-content` — (re)seed the
  agent-editable `content/` copy (the guide's `*.md` only) from
  `packages/guide`.
- `npm run build` — bundle the shell client (`dist/main.js`).
- `npm run serve` — the shell server on `PORT` (default 5173): page,
  bundle, in-process index, and the `/api/*` seams (`/api/session`,
  `/api/doc`, `/api/edit`). For live sessions put `OPENAI_API_KEY` in the
  repo-root `.env` (see `.env.example`) — or export it, which wins over
  the file.
- `npm run test` — strict typecheck + the offline specs (the granular
  edit applier/locator/diff builder, the path guard, event decoding for
  both tools, the live-preview reducer, the wire casters).

From the repo root: `scripts/serve-poc.sh poc4b-coedit` (it sources the
root `.env`; an explicit `OPENAI_API_KEY=…` prefix still overrides)
(host port **5190** → container 5173; tunnel route `plgg-poc4b.qmu.dev`;
single-process — see
[`workloads/poc4b-coedit/`](../../workloads/poc4b-coedit/compose.yaml)).
Build the bundle first (`npm run build`); the container auto-seeds
`content/` on first run.

Cloudflared ingress (developer-applied, `~/.cloudflared/config.yml`,
before the catch-all):

```yaml
- hostname: plgg-poc4b.qmu.dev
  service: http://localhost:5190
```

## Sovereignty note

Voice and typed turns stream to OpenAI's Realtime API, authorized by a
SHORT-LIVED key the server mints; the standing key never reaches the
browser. Search runs locally over the shipped index; edits write only the
git-ignored `content/` copy, never the real guide.
