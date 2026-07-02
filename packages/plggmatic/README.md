# plggmatic

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **pre-organized, composable full-stack web-application
framework**, built on the plgg family. It supplies the
framework-generic parts — config loading, a router builder,
static-build orchestration, and a pre-organized CLI — and
wraps the mid-library surfaces, so an app supplies only its
own content and render specifics and depends on plggmatic
(plus the [`plgg`](../plgg/) foundation) alone.

## Why this package exists

A site generator like [`plggpress`](../plggpress/) and a
bespoke app share the same skeleton: load a config, build a
router, run a static build or serve. plggmatic extracts that
skeleton so each app writes only what makes it distinct:

```
plgg ─┬─ plgg-http ─ plgg-server ─┐
      ├─ plgg-view ───────────────┤
      ├─ plgg-md ─────────────────┼─ plggmatic ── plggpress
      ├─ plgg-highlight ──────────┤
      └─ plgg-cli ────────────────┘
```

Dev / hot-reload is deliberately **not** here — that is a
toolchain concern owned by [`plgg-bundle`](../plgg-bundle/)'s
`dev` server.

## The facade boundary (amended)

plggmatic originally drew a thinner line — "the framework
never renders" — and depended only on
[`plgg-http`](../plgg-http/) / [`plgg-server`](../plgg-server/)
/ [`plgg-cli`](../plgg-cli/). That boundary was deliberately
amended: the framework now also wraps
[`plgg-view`](../plgg-view/), [`plgg-md`](../plgg-md/), and
[`plgg-highlight`](../plgg-highlight/), re-exporting their
full surfaces so a consumer imports the whole stack's
vocabulary from one place and its dependency list collapses
to `{plgg, plggmatic}`. The wrap is a **pure re-export** — no
behavior accretes in the facade, so each mid-library stays
independently rebuildable behind it.

Two subpath vocabularies mirror the wrapped packages'
own entries:

- `plggmatic/ssg` — [`plgg-server/ssg`](../plgg-server/), the
  node-only static-site seam (kept off the runtime-neutral
  root barrel).
- `plggmatic/style` — [`plgg-view/style`](../plgg-view/), the
  inline-style utilities whose Tailwind-style names (`p`,
  `text`, …) would collide with the Html element builders.

Nine names exist in two wrapped libraries with different
meanings; the root barrel resolves them to the
**page-authoring (plgg-view) variant**: `head`, `header`,
`on`, `link`, `strong`, `table`, `text$`, `ListItem`,
`TableRow`. The shadowed variants (plgg-server's HEAD-route
`head`, context `header`, route-matcher `on`; plgg-md's AST
constructors and node types) remain reachable from their own
packages.

## How it's organized

- **Config** — `loadConfig` reads and validates an app's
  config across the untrusted boundary.
- **Routing** — `buildRouter` assembles a
  [`plgg-server`](../plgg-server/) router from the app's page
  set.
- **Build** — `build` runs a `BuildSpec` to emit the static
  site, returning a `BuildReport`.
- **App** — `AppOptions` / `BuildReport` and the
  `ConfigLoadError` vocabulary.
- **Cli** — `runApp` + `resolveOptions` are the pre-organized
  `argv` → build/serve entrypoint, built on
  [`plgg-cli`](../plgg-cli/).

plggmatic is ESM-only (no CJS entry).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`); config crosses into the typed core through one
  validating boundary.
- After editing a `file:`-linked dependency's source, rebuild
  its `dist` or this package won't see new exports.
