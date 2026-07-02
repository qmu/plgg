# plggmatic

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **pre-organized, composable full-stack web-application
framework**, built on the plgg family. It supplies the
framework-generic parts — config loading, a router builder,
static-build orchestration, and a pre-organized CLI — and
leaves an app to supply its own content and render specifics.

## Why this package exists

A site generator like [`plggpress`](../plggpress/) and a
bespoke app share the same skeleton: load a config, build a
router, run a static build or serve. plggmatic extracts that
skeleton so each app writes only what makes it distinct:

```
plgg ─┬─ plgg-http ─ plgg-server ─┐
      └─ plgg-cli ────────────────┴─ plggmatic ── plggpress
```

Dev / hot-reload is deliberately **not** here — that is a
toolchain concern owned by [`plgg-bundle`](../plgg-bundle/)'s
`dev` server.

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
