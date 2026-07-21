# @plggmatic/example

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The **workbench** — the reference [plggmatic](../plggmatic/) app, now written as
a **declaration**. The traversable column stack (drilling a section pushes a
notes column, drilling a note pushes the reader, the arrangement round-trips
through the URL) is derived, not hand-written: a plggmatic declaration
(Resources, Menu, list/detail views, a Query filter, create/delete Actions with
confirmation-as-data) passed through `schedule(...)` and drawn by the
multi-column renderer.

**Phase-4 proof of value (line-count).** The hand-written program — a bespoke
`Model`/`Msg`/`update`, a hand-rolled total URL codec, the column-stack
composition, and the chrome — was **691 lines** (`app.ts` at `5ad57db`). The
declarative rewrite is `app.ts` (the mount + app identity) plus `declaration.ts`
(the program as data) — **~263 lines**, a ~62% reduction — and the app author
hand-writes no `Model`, `Msg`, `update`, URL codec, column geometry, or any
`aria-*` attribute for anything the framework renders.

[plgg-view](../plgg-view/)'s `application` runtime owns the history/link wiring;
the app stays pure. Built by the in-house app bundler into a self-contained
`dist/`, served under the docs site at `/example/`. A second entry
(`forms.html`) showcases the ticket-12 form components (caster-parsed form,
confirm dialog, toaster) in isolation.
