# Sheets and islands — making the plgg-flow sample site with plggpress

Goal: the plgg-flow demo (packages/plgg-flow-example) can be written
as a plggpress site — Markdown pages, one per sample — and look and
behave the same: a numbered sidebar, a page that is one sheet (title
and description on one line, the board filling the rest of the window
with the DSL laid over its right side, no page scroll), a board that
is part of the page (theme, type, size), and per-sample tools.

Decided by the owner (2026-11-24): **iframes go**, and **there is a
code seam for registering parts**.

## 1. Islands replace iframes

Today a `plgg-flow` / `plgg-diagram` fence becomes a sandboxed
`<iframe srcdoc>` with the whole browser runtime inlined per block
(SiteConfig/usecase/diagramFence.ts). That cannot follow the page's
size or theme, and repeats the runtime for every block.

New contract:

- A fence renders **a mount point with its static form inside**:
  `<div data-island="NAME" data-fill?>` + the SSR fallback + a
  `<script type="application/json">` child carrying
  `{ code, info }` (escaped; never executed). With no script the page
  reads exactly as now — the no-JavaScript test keeps passing.
- Each island's browser runtime is **one ES module emitted once per
  site** under `<base>assets/islands/NAME.<hash>.js`. Its default
  export is `(root: Element, props: { code: string; info: string })
  => void | (() => void)` (an optional dispose).
- A page that contains at least one island gets **one small inline
  loader**: it finds `[data-island]` not yet mounted, dynamic-imports
  the module for that name (the page carries a name → URL map), and
  mounts. It also mounts inside columns the navigation runtime
  inserts later: the navigation script dispatches a
  `plgg:columns` event on `document` after it changes the strip, and
  the loader listens for it. Pages without islands carry no loader
  and no module — the guide stays as light as today.
- The island lives in the page's document: it inherits the type and
  reads the theme through the plggmatic custom properties, so dark
  mode applies to the board too (flow CSS must use tokens, not
  literals).
- Styles of an island are emitted once per page in the page's inline
  `<style>` (as `flowCss` is inside the iframe today), scoped under
  `[data-island="NAME"]`.

## 2. The registration seam

`SiteConfig` stays decoded data. Parts are code, so they get their own
file next to it: **`site.parts.ts`** (optional; `--parts <path>` to
override), default-exporting

```ts
type Part = Readonly<{
  /** the fence language and the island name */
  name: string;
  /** build time: the static form (must read without script) */
  render: (code: string, info: string) => Html<never>;
  /** build time: CSS for the page, scoped by the island name */
  css: string;
  /** a built browser ES module (file path or package specifier,
   *  resolved from the site directory) with the default-export
   *  mount described above */
  runtime: string;
}>;
export default { parts: readonly Part[] };
```

plggpress ships two built-in parts (`plgg-flow`, `plgg-diagram`),
registered the same way; a site's part with the same name replaces
the built-in. plggpress does not bundle: `runtime` points at a module
the site has already built (the demo package builds with plgg-bundle).

## 3. Page shapes

Front matter picks the shape: `layout: doc` (default, today's reading
column) or `layout: sheet`, plus `description:`.

A **sheet** page:
- its column takes the remaining width of the viewport (no measure);
- the column head shows the title and, beside it on the same
  baseline, the description in the muted colour (as the demo);
- the column body does not scroll; the first island with `fill`
  (fence info string contains `fill`) takes the whole body; any
  Markdown before it is the sheet's short intro, after it is ignored
  on a sheet (warn at build).

## 4. The flow part grows into the demo's sheet

The demo's stage (board, DSL panel laid over the board's right side
with a translucent background, 「リセット」, the round 「＋」, two-way
DSL ↔ board, fit to frame, the measured frame from the demo) moves
out of plgg-flow-example into a reusable module
(`plgg-ir-diagram/flowSheet` or a new entry of plgg-flow) used by
both the demo and the `plgg-flow` part. Fence options in the info
string: `fill`, `dsl` (show the DSL overlay), `tools=split,snap`
(see 6). Without options the part is the small inline board it is
today (平面 / 立体 / 全体, source under a disclosure).

## 5. Sidebar

`SiteConfig.sidebarStyle?: "plain" | "numbered"` (CSS counter with
leading zero, as the demo), `tagline?` under the wordmark, and
`footerLink?: { text, link }` at the bottom of the sections column.

## 6. Tools (after 1–5)

Named tools live in plgg-flow (`plgg-flow/tools`): a tool is
`{ name, label, view(flow) → controls, … }` built from pure `Change`s.
The fence lists them by name. Read-only views (minimap, trace,
outline) are tools too. Tools that need state beyond the flow (undo
history, snapshots, files, revisions) come last and need a session
record in the flow sheet.

## Acceptance

- `packages/plgg-flow-example/markdown/` gains sheet pages for the
  samples that need no bespoke tool (立体交差, 自動配置, エッジの経路 with
  `tools=routes`, …) and looks like the demo side by side.
- The guide builds unchanged apart from `plgg-flow` blocks no longer
  being iframes; pages without islands emit no script beyond today's.
- No-JavaScript: every page still reads; boards are static drawings.
- Tests: fence markup, loader presence only on island pages, asset
  emitted once, part override, sheet layout markup, sidebar options.

## Round P1 review — adopted

Sections 1–5 are in and the three sample sheets exist in
plgg-flow-example/markdown (`/samples/space/`, `/samples/layered/`,
`/samples/rooms/`). Checked by the reviewer: every touched package's
tsc and tests (plgg-md 138, plggmatic 349, plgg-ir-diagram 4,
plggpress 343, plgg-flow-example 9, plgg-flow 223), both sites built
with no iframe, one island module emitted once, and on screen the
sample sheet in plggpress is the demo's sheet: numbered sidebar, title
and description on one line, board filling the rest, DSL beside it,
リセット / 最適化 / ＋.

Differences still visible side by side (for P2):
- the demo's own stylesheet (plgg-flow-example/index.html) still
  carries rules the shared board stylesheet lacks, so the plggpress
  sheet differs: the rooms lattice is all ink (no faint inner lines,
  no floor wash), the ＋ sign is a text glyph off-centre, the − button
  likewise, the hint line touches the bottom edge. **One stylesheet**:
  everything the board, its controls, the DSL panel, the lattice, the
  marquee, cursors and hints need lives in the shared module; the
  demo's index.html keeps only its page chrome (sidebar, title).
- the DSL panel on the plggpress sheet must lie over the board with
  the same translucency as the demo (and the fit must stay clear of
  it).
- dark mode: check the sheet on a dark page — board, grid, nodes,
  wires, lattice and panel must all follow the theme tokens.
