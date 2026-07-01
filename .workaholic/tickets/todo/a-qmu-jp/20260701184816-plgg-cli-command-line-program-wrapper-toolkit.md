---
created_at: 2026-07-01T18:48:16+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category: Added
depends_on:
---

# Create `plgg-cli`: a plgg-style toolkit for building command-line program wrappers

## Overview

Introduce a new first-party package **`plgg-cli`** — a type-driven,
`Result`-returning toolkit for **wrapping your own program as a command-line
program** (think `commander.js`, done in the plgg idiom). It gives a package a
typed way to declare its commands, options/flags, and positional arguments,
parse `process.argv` into a validated shape, dispatch to the right handler, and
fold the handler's `Result` into a shell outcome (stdout / stderr / exit code) —
with an auto-generated usage banner.

**Direction (locked with the requester):** this is the *entrypoint* toolkit that
**builds** command-line wrappers — NOT a wrapper that spawns *external* programs.
There is a real naming hazard here: everywhere else in this repo "CLI" already
means "a package's own argv→exit-code entrypoint" (`plgg-test`, `plgg-bundle`,
`plgg-press` each hand-roll one). `plgg-cli` is the shared toolkit those
hand-rolled entrypoints should have been built on. A separate *spawn external
programs* library (`spawn/exec → PromisedResult<CommandResult, SpawnError>`) is a
plausible future package but is **explicitly out of scope** here — do not build
it in this ticket.

**Why now / proof-of-value:** the requester's chosen demo is to **reimplement
`packages/plgg-press/src/cli.ts` on top of `plgg-cli`**. That file today
hand-rolls every piece this toolkit should own: a `flag(argv, name)` scanner, a
`print`/`fail` stdout/stderr+`exitCode` pair, positional command dispatch
(`command === "build" ? … : "dev" ? … : usage`), and a `Result`→shell fold. It
is the concrete, runnable evidence the toolkit removes real duplication rather
than adding an abstraction for its own sake. (`plgg-test`'s `src/Cli` and
`plgg-bundle`'s `src/entrypoints/cli.ts` are follow-on migration candidates —
out of scope for this ticket, note them only.)

**House constraints (non-negotiable):** plgg is its own only consumer, so
breaking changes are fine and no backward-compat is preserved — design the best
API. **Zero new third-party dependencies** (vendor-neutrality): build on
`node:process` and the already-present `typescript` / `plgg-bundle` / `plgg-test`
only; do **not** add an argument-parsing library. `as` / `any` / `@ts-ignore`
are strictly prohibited. Prefer branded `Str`/`asStr` over `SoftStr` in the new
surface. Prettier `printWidth: 50`.

## Scope

**Deliverable (locked): scaffold + one real usecase.** Land the full package
skeleton *and* enough of the toolkit to reimplement `plgg-press/src/cli.ts`
end-to-end with real (non-mock) argv tests and coverage strictly over 90%. This
is not a bodiless scaffold and not the entire conceivable surface — it is the
minimum coherent toolkit that makes the `plgg-press` reimplementation clean.

**In scope**
- New package `packages/plgg-cli/` mirroring the `plgg-fetch` skeleton.
- A `Cli` domain: typed command/option/positional specs, `process.argv`
  parsing into a validated shape, command dispatch, usage-banner generation, and
  the `Result`→(stdout / stderr / `exitCode`) fold.
- A **seam** module quarantining every `process.*` / stdout / stderr / exit
  touch, so the domain stays pure and `Result`-based.
- Registration in the repo's build/install/gate orchestration + per-package
  helper scripts.
- Reimplementation of `packages/plgg-press/src/cli.ts` on `plgg-cli`, behaviour
  preserved (commands `build` / `dev` / usage; flags `--config`,
  `--contentDir`, `--outDir`; identical exit codes and messages).

**Out of scope (note as follow-ons, do not build)**
- Spawning/exec-ing external programs (`CommandResult` / `SpawnError`).
- Migrating `plgg-test`'s `src/Cli` or `plgg-bundle`'s `src/entrypoints/cli.ts`.
- Interactive prompts, colour output, shell-completion generation.

## Proposed API (starting point — `/drive` may refine within these defaults)

A declarative, data-last builder over a typed program description. Illustrative,
not final — the `plgg-press` reimplementation is the acceptance oracle for
whether the surface is sufficient:

```ts
// Declare the program, its commands, and their options.
const program = cli("plgg-press", {
  summary: "static site generator",
  commands: [
    command("build", "build the site", {
      options: [
        option("config", { arg: "path" }),
        option("contentDir", { arg: "path" }),
        option("outDir", { arg: "path" }),
      ],
    }),
    command("dev", "run the dev server", {
      /* same options */
    }),
  ],
});

// Parse -> Result, never throw across the boundary.
// parse(program, argv): Result<Invocation, CliError>
//   Invocation = { command: Str; options: ...; positionals: ReadonlyArray<Str> }
//   CliError    = Box union: UnknownCommand | MissingOptionValue | ... (+ Defect)

// Fold a handler Result into the shell. `runCli` is the single place
// process.exitCode / stdout / stderr are written (the seam) — the only
// spot the "Err -> non-zero exit" mapping lives.
await runCli(program, process.argv.slice(2), {
  build: (inv) => /* Promise<Result<Report, SsgError | ...>> */,
  dev:   (inv) => /* ... */,
});
```

Design intents to honour:
- **Non-empty by construction:** command names, option names, and the program
  name are `Str` (`asStr` at the spec boundary). Raw `process.argv` entries and
  option *values* arrive as `SoftStr` and are refined where non-emptiness is
  actually guaranteed — do not launder empties into `Str`.
- **Exhaustive dispatch** over the tagged `CliError` union with `match` /
  `pattern` (compile-time coverage), no `switch`.
- **Auto usage:** the banner is derived from the program/command/option specs,
  not a hand-written string, so `plgg-press`'s `USAGE` constant disappears.
- **Runtime note:** `process.argv` makes this a Node/edge (runtime-specific)
  package like `plgg-server`, not runtime-neutral like `plgg-http`.

## Key Files

- `packages/plgg-fetch/` — **the skeleton to mirror**: `package.json` (scripts,
  dual `es`/`cjs` exports, `file:` deps), `tsconfig.json`, `tsconfig.build.json`,
  `bundle.config.ts`, `.prettierrc.json` (printWidth 50), `plgg-test.config.json`
  (`coverage.threshold: 91`, exclude `/index.ts`), `README.md`, `example.ts`,
  `src/index.ts` barrel, and the `src/Http/{model,usecase}` role layout.
- `packages/plgg-fetch/src/Http/usecase/seam.ts` — the canonical
  quarantine-the-imperative-boundary pattern to copy for the `process.*` seam.
- `packages/plgg-fetch/src/Http/model/ClientError.ts` — template for a
  `Box`-based domain error union with constructors, `pattern$` matchers, `isX`
  guards → model `CliError` the same way.
- `packages/plgg/src/Flowables/{proc,cast,pipe,flow,match}.ts` — the pipeline
  combinators the toolkit is built from (`proc` for the async handler fold).
- `packages/plgg/src/Disjunctives/{Result,Option}.ts`,
  `packages/plgg/src/Contextuals/Box.ts`, `packages/plgg/src/Basics/Str.ts`
  (`asStr`/`isStr`, preferred), `packages/plgg/src/Atomics/SoftStr.ts`.
- **`packages/plgg-press/src/cli.ts`** — the reimplementation target (and the
  behaviour oracle); `packages/plgg-press/package.json` gains a
  `"plgg-cli": "file:../plgg-cli"` dep; `packages/plgg-press/bin/plgg-press.mjs`
  + `bin/hook.mjs` show how the entrypoint is launched (unchanged by this work).
- `scripts/build.sh`, `scripts/npm-install.sh`, `scripts/check-all.sh` — the
  three orchestration scripts a new package must be registered in.
- `scripts/tsc-plgg-fetch.sh`, `scripts/test-plgg-fetch.sh` (+ watch variants) —
  per-package helper scripts to copy as `*-plgg-cli.sh`.
- `.github/workflows/{run-tests.yml,deploy-guide.yml}` — CI gate + the
  guide-build package list (add `plgg-cli` if the guide should see it).

## Related History

- `moderation: clear` — no existing ticket/package/commit covers this. The only
  other todo tickets are the unrelated `a-qmu-jp/2026070101330x-refine-*`
  string/number refinement set.
- Sibling-package births to mirror the process of: `b3d9590` (plgg-bundle),
  `1b96e47` (plgg-test), `bf45ee6` (plgg-http extraction), `775ccc2` (plgg-md),
  `6094d84`/`e0c4191` (plgg-db-migration incl. a package-entrypoint CLI),
  `b763ac0` (plgg-press scaffold incl. its config-loading CLI). Each is
  ticket-first: scaffold + typed skeleton + a runnable proof spec, then
  follow-ons fill bodies.
- Existing hand-rolled entrypoints that motivate the toolkit (and are future
  migration candidates, out of scope here): `packages/plgg-test/src/Cli/cli.ts`,
  `packages/plgg-bundle/src/entrypoints/cli.ts`.

## Implementation Steps

1. **Scaffold `packages/plgg-cli/`** by mirroring `plgg-fetch`: `package.json`
   (name `plgg-cli`, version `0.0.1`, dual `es`/`cjs` exports, scripts
   `build`/`test`/`tsc`/`coverage` + watch variants, `dependencies:
   { plgg: "file:../plgg" }`, devDeps `@types/node` + `plgg-bundle` +
   `plgg-test` + `typescript` matching the sibling versions), `tsconfig.json`
   (retarget the `paths` key to `{ "plgg-cli*": ["./src/*"] }`),
   `tsconfig.build.json`, `bundle.config.ts` (`alias.prefix: "plgg-cli"`),
   `.prettierrc.json` (printWidth 50), `plgg-test.config.json`
   (`{ coverage: { threshold: 91, exclude: ["/index.ts"] } }`), `README.md`,
   `example.ts`, and `src/index.ts` (`export * from "plgg-cli/Cli";`).
2. **Register the package**: add a dependency-ordered
   `cd packages/plgg-cli && npm run build` to `scripts/build.sh` **before**
   `plgg-press` (since `plgg-press` will consume it) and after `plgg`; add
   `npm install` to `scripts/npm-install.sh`; add `./scripts/test-plgg-cli.sh`
   to `scripts/check-all.sh`; create `scripts/{tsc,test,tsc-watch,test-watch}-plgg-cli.sh`
   by copying the `plgg-fetch` equivalents (`s/plgg-fetch/plgg-cli/`); add
   `plgg-cli` to the `deploy-guide.yml` build loop only if the guide needs it.
3. **Model layer** (`src/Cli/model/`): typed `Readonly` records for the program /
   command / option / positional specs; the parsed `Invocation` shape; and the
   `CliError` `Box` union (e.g. `UnknownCommand`, `MissingOptionValue`,
   plus `Defect` from `proc`) with constructors, `pattern$` matchers, `isX`
   guards. One `Foo.ts` + colocated `Foo.spec.ts` each. No `as`/`any`.
4. **Usecase layer** (`src/Cli/usecase/`): `parse` (argv → `Result<Invocation,
   CliError>`), `usage` (spec → banner `Str`), `dispatch` (invocation +
   handler map → handler `Result`), and `runCli` (the top fold). Put every
   `process.argv` / `process.stdout.write` / `process.stderr.write` /
   `process.exitCode` touch in a `seam.ts` whose functions return
   `Result`/`PromisedResult` (mirror `plgg-fetch/.../seam.ts`). `runCli` is the
   single place an `Err` becomes a non-zero exit.
5. **Barrel**: `src/Cli/index.ts` re-exports `./model` + `./usecase`;
   `src/index.ts` re-exports `plgg-cli/Cli`.
6. **Reimplement `packages/plgg-press/src/cli.ts` on `plgg-cli`**: add
   `"plgg-cli": "file:../plgg-cli"` to `packages/plgg-press/package.json`,
   ensure `build.sh` builds `plgg-cli` before `plgg-press`, and rewrite `cli.ts`
   so `flag`, `configPathOf`, `print`, `fail`, `USAGE`, and the positional
   dispatch are all expressed through the toolkit. Behaviour must be identical:
   commands `build` / `dev`, no-arg/unknown → usage, flags `--config` /
   `--contentDir` / `--outDir`, the same error/success messages, and
   `exitCode = 1` on failure. Keep `bin/plgg-press.mjs` + `bin/hook.mjs`
   unchanged.
7. **Tests** (colocated `*.spec.ts`, run via `plgg-test src`): real-argv parsing
   (flags present/absent/empty, unknown command, missing option value),
   usage-banner derivation, dispatch, and the `runCli` fold capturing
   stdout/stderr/`exitCode` at the seam. Keep/extend
   `packages/plgg-press/src/*.spec.ts` so the reimplemented CLI's behaviour is
   pinned. Push coverage strictly over 90% (threshold 91).
8. **Green the gates**: `scripts/tsc-plgg-cli.sh`, `scripts/test-plgg-cli.sh`,
   the `plgg-press` gate, and finally `scripts/check-all.sh` all pass.

## Considerations / Risks

- **Naming collision (document it):** "CLI" already means "a package's own
  entrypoint" throughout the repo. State plainly in `README.md` that `plgg-cli`
  is the toolkit that *builds* those entrypoints, to avoid future confusion with
  the (out-of-scope) spawn-external-programs idea.
- **Effect quarantine:** `process.*` is inherently effectful; if any of it leaks
  out of the seam into the domain, the design has failed — the domain must be
  pure and `Result`-based, testable without touching the real `process`.
- **`Str` vs `SoftStr` honesty:** option *values* and raw argv entries can be
  empty strings; refine to `Str` only where non-emptiness is genuinely
  guaranteed, else keep `SoftStr`. Do not weaken the brand to make types pass.
- **Vendor-neutrality:** no argument-parsing dependency — this is a `node:process`
  + `typescript` build. Adding any third-party runtime dep fails the gate.
- **Behaviour parity is the oracle:** the reimplemented `plgg-press` CLI must be
  byte-for-byte equivalent in observable behaviour; if the toolkit can't express
  something `cli.ts` does, extend the toolkit rather than degrade `plgg-press`.
- **Build order:** forgetting to build `plgg-cli` before `plgg-press` in
  `build.sh` will surface only in a clean run / CI — verify the ordered build
  from a clean `dist/`.

## Quality Gate

The `/drive` approval gate is met only when **all** of the following are
objectively green (locked with the requester):

1. **tsc + test scripts green, package wired into the canonical gate.**
   `scripts/tsc-plgg-cli.sh` and `scripts/test-plgg-cli.sh` pass, and
   `plgg-cli` is registered in `scripts/build.sh`, `scripts/npm-install.sh`, and
   `scripts/check-all.sh` so `check-all.sh` exercises it. `plgg-press`'s own
   gate still passes after the reimplementation.
2. **Coverage strictly > 90%.** `plgg-test.config.json` threshold `91` across
   statements/branches/functions/lines (v8 provider), `index.ts` excluded; the
   `--coverage` run passes.
3. **Real-process demo.** `packages/plgg-press/src/cli.ts` is reimplemented on
   `plgg-cli` with behaviour preserved (commands `build`/`dev`/usage; flags
   `--config`/`--contentDir`/`--outDir`; identical exit codes and messages), and
   there is a runnable `example.ts` and specs that parse real argv through the
   toolkit — not mocks. This reimplementation is the acceptance oracle.
4. **No escape hatches.** Zero `as` / `any` / `@ts-ignore`; zero new third-party
   dependencies (`node:process` + `typescript` + existing `plgg*` only); every
   `process.*` / stdout / stderr / exit touch is confined to a seam module that
   returns `Result`. Prettier `printWidth: 50` clean.

**Edge cases the tests must cover:** no arguments (→ usage), unknown command
(→ usage or a typed `UnknownCommand`, matching current `plgg-press` behaviour),
a `--flag` with no following value, a flag absent (→ default), an empty-string
flag value, and a handler returning `Err` (→ stderr message + `exitCode = 1`).
