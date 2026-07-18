# Web development as one typed pipeline

A TypeScript family built from scratch on a single idea — values flow through pure functions, errors are data, and the same program runs on the server and in the browser.

Start with [Getting started](/getting-started), read the [core concepts](/concepts/), or browse the source [on GitHub](https://github.com/qmu/plgg).

## Option, not null

Absence is a value you must handle, never a null that slips through. The compiler keeps the gaps honest.

## Result, not throw

Errors travel as data through the pipeline and fold to one vocabulary at the edge, instead of unwinding the stack.

## One pipeline, end to end

pipe / cast / proc / flow compose validation, effects, and transforms into a single data-last expression.

## Runtime-neutral core

plgg-http models request/response as pure data; plgg-server and plgg-fetch are symmetric peers over the same model.

## Server and client, one program

plgg-view's Elm-Architecture Model/update/view renders both server-side (SSR) and in the browser (CSR) from the same source.

## Built from scratch

Every package — HTTP, router, view, SQL, AI orchestration — is built on plgg, so the same patterns hold across the whole family.

## The plggmatic reference

**plggmatic** is the family's horizontal-orientation UI framework — a declarative surface (Declare / Flow / Form / Layout / Catalog over the render engine) that projects a Scene into a strip of columns that grow to the right as you drill in, so depth never consumes the viewport. Its **reference** is a running example you can open and edit: `packages/plggmatic-example` (demo1, a contract-development business-management app).

- **Live:** <https://plggmatic-reference.qmu.dev/demo1.html> — the exhibit, served with hot reload.
- **Develop it:** `cd packages/plggmatic-example && npm run dev` → <http://localhost:51820>. An edit under `src/` rebuilds and the browser reloads with no restart.
- **Direction:** plggmatic grows here as the general framework the reference is measured against, with the long aim of again backing a horizontal-orientation layout in `qfs-viewer`. See the `grow-plggmatic-as-the-reference-framework` mission.
