---
created_at: 2026-07-16T00:04:45+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission:
---

# `plgg-mcp` pulls `plgg-content` into every consumer, which costs it node

## DECISION (2026-07-16, developer): Option 2 — re-extract the MCP package

The developer chose **re-extraction**: the protocol substrate (`Mcp`, `Rpc`,
`Transport`, `vendors`) becomes `packages/plgg-mcp` again (version 0.0.2 — 0.0.1
is frozen on npm), with **no content coupling anywhere in its module graph**;
`Tools/contentTools` stays in `plgg-cms`, which consumes `plgg-mcp` and keeps its
public surface unchanged via re-export. The durable pin (step 4) ships with it:
a spec asserts `node:sqlite` is absent from `plgg-mcp`'s transitive source
import graph and that its runtime dependency set is exactly `plgg` — the
module-graph restatement of the bun gate (bun is not installed on this host).
This partially reverses `87b46fc9` deliberately: a substrate that reaches a
SQLite store is not a substrate, and ticket 27's HTTP+OAuth transport needs the
clean seam.

## STATUS (2026-07-16, night `/drive`): DIAGNOSIS CONFIRMED — prescription is not possible as written. Needs a developer decision.

Not started. **The problem is real and this ticket measured it correctly.** What does
not hold is the fix, and the reason is worth reading before re-filing.

### What was verified (re-measured against the published artifact, not inferred)

| this ticket's claim | verdict |
|---|---|
| `exports` has exactly one entry | **TRUE** |
| the entry imports `plgg-content` at top level | **TRUE** — `import * as __ext2 from "plgg-content"` is line 3 of `dist/index.es.js` |
| `plgg-content` reaches `node:sqlite` | **TRUE** — 3 occurrences, exactly as cited |
| *"the bundle already emits those directories … this is a packaging change, not a code one"* | **FALSE** |
| the proposed `"./mcp": "./dist/Mcp/index.es.js"` | **the file does not exist** |

`dist/Mcp`, `dist/Rpc`, `dist/Tools`, `dist/Transport` and `dist/vendors` are real
directories in the published tarball — but they hold **`.d.ts` declarations only**. The
package emits exactly one JavaScript file, `dist/index.es.js`. They are TypeScript
declaration trees, not emitted module trees. Seeing them in a listing and reading them as
"the layering already exists, only `exports` collapses it" is a natural inference; it is
just not what the bundler did.

So step 1 cannot be a packaging change. Pointing `exports` at those paths yields a
subpath that resolves to nothing. Real subpath entries require **new bundle entries** —
`bundle.config.ts` currently declares a single `{ name: "index", input: "index.ts" }` —
which is a build change, and the thing that then needs designing is which entry points
are worth committing to as public surface.

### And the package it names no longer exists

`packages/plgg-mcp` was **deleted from this repo** in `87b46fc9` ("Consolidate Prag CMS
package boundary"). `plgg-mcp@0.0.1` remains frozen on npm as `latest` — which is why
this ticket could measure it — but its source is gone. The MCP code now lives inside
`plgg-cms` at `src/mcpProtocol/{Mcp,Rpc,Tools,Transport,vendors}`, and `plgg-cms`'s
`bundle.config.ts` states the intent in as many words:

> the former content and MCP source trees are now **internal plgg-cms modules**

### The concern survives the move — which is what makes this a decision, not a chore

`plgg-cms` has the identical shape: a single `.` export, one emitted `index.es.js`, and
`node:sqlite` reachable through `src/content/**`. Only `mcpProtocol/Tools/contentTools.ts`
imports `plgg-cms/content`; `Mcp`, `Rpc`, `Transport` and `vendors` do not touch it. So
the separation this ticket wants is real **in the source** — it is the *build* and the
*package boundary* that collapse it, in both the old package and the new home.

That means honouring this ticket means re-splitting a boundary that `87b46fc9`
deliberately consolidated, three days ago. **That is a developer call, and it is why this
was not done autonomously.** The options, none of them mechanical:

1. **Add subpath bundle entries to `plgg-cms`** (e.g. `mcpProtocol`) and export them —
   additive, keeps `.` intact, but promotes "internal modules" back to public surface and
   partially reverses the consolidation.
2. **Re-extract an MCP package** — fully reverses `87b46fc9`.
3. **Leave it**; the consumer keeps its dynamic `import()` deferral, and the frozen
   `plgg-mcp@0.0.1` stays as-is. Cheapest, and leaves ticket 27's HTTP+OAuth transport to
   meet the same wall later — which is this ticket's strongest argument against it.

Whichever is chosen, the npm consumer on the frozen `plgg-mcp@0.0.1` needs a migration
decision of its own: no fix to `plgg-cms` reaches it without the consumer changing
dependency.

### Also worth keeping

- **`bun` is not installed on this host**, so the quality gate as written
  (`bun -e "import('plgg-mcp/stdio')"`) cannot be run here at all. Whoever takes this
  needs bun available, or the gate must be restated as a module-graph assertion.
- Installing `plgg-mcp@0.0.1` needs `npm_config_min_release_age=0` — the host's `.npmrc`
  sets `min-release-age=7` and the version is younger than that, so a plain install
  fails `ETARGET`.
- **Step 4 (the pin test) is the durable part of this ticket** and survives every option
  above: whatever entry is meant to be sqlite-free should have a test asserting
  `node:sqlite` is not in its module graph. Without it this regresses on the first
  convenience re-export.

## Policies

- `workaholic:implementation` / `policies/anti-corruption-structure.md` — the ask is
  fundamentally a boundary question: whether the protocol substrate may be reached
  without the store behind it. `node:sqlite` is a vendor concern and must not be
  dragged across a seam that does not need it.
- `workaholic:implementation` / `policies/directory-structure.md` — decides whether
  `mcpProtocol/**` stays an internal module of `plgg-cms` (its current, deliberate
  state per `87b46fc9`) or is promoted back to public subpath surface. This is the
  section that actually governs the open decision.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — `Mcp`/`Rpc`/
  `Transport` are protocol; `Tools/contentTools` is a consumer of the content domain.
  Only the latter may reach the store.
- `workaholic:implementation` / `policies/test.md` — step 4's pin (assert `node:sqlite`
  is absent from the sqlite-free entry's module graph) is the part that keeps any fix
  from regressing, and it is the one step that survives every option below.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/
  `ts-ignore`; Prettier printWidth:50.
- `workaholic:operation` / `policies/ci-cd.md` — the quality gate names `bun`, which is
  not installed on this host; a gate that cannot run in the repo's own pipeline is not
  a gate.

## Overview

`plgg-mcp` publishes exactly one entry point, and that entry imports
`plgg-content` at the top of the file. So a consumer that registers its OWN
tools — which is what the package's `runStdioServer(tools, serverInfo)`
signature invites — still loads the plggpress content store, and with it
`node:sqlite`.

On node that is a warning on every invocation. On **bun it is fatal**.

## Findings

Measured against the published `plgg-mcp@0.0.1`, not inferred:

```
$ node -e "console.log(JSON.stringify(require('plgg-mcp/package.json').exports))"
{".":{"import":{…,"default":"./dist/index.es.js"},"require":{…}}}      # one entry

$ head -4 node_modules/plgg-mcp/dist/index.es.js
import * as __ext2 from "plgg-content";                                # top level

$ grep -c "node:sqlite" node_modules/plgg-content/dist/index.es.js
3

$ bun -e "import('plgg-mcp')"
No such built-in module: node:sqlite
```

There is no import order that avoids it: touching `plgg-mcp` at all loads
`node:sqlite`. A consumer can defer the cost with a dynamic `import()` — which
is what one did, so that its `--version` would stop failing on bun — but it
cannot avoid it for the MCP verb itself, which is the one thing it wanted the
package for.

## Why this is plgg's question rather than a consumer's

**D15 made `plgg-mcp` the protocol substrate**, in the archived ticket's own
words: *"It builds the protocol substrate every later integration stands on:
the HTTP+OAuth transport (ticket 27) and the auto-generated Claude Code plugin
export (ticket 30)."*

A substrate that reaches a SQLite store is not a substrate — it is plggpress's
content server with a JSON-RPC front door. The `contentTools`
(`search_content` / `get_article` / `list_collections`) are a fine *default*
tool set; they are not the protocol, and the package's own layering already
says so (`dist/Rpc`, `dist/Transport`, `dist/Mcp`, `dist/Tools`, `dist/vendors`
are separate directories). Only `package.json`'s `exports` disagrees.

The HTTP+OAuth transport of ticket 27 will hit this too: an HTTP MCP server
that must link a SQLite index to answer `initialize` is carrying weight for a
tool set its consumer may never register.

## Implementation Steps

1. **Split the `exports` map** so the protocol core is reachable without the
   content tools — e.g.

   ```jsonc
   {
     "exports": {
       ".":              "./dist/index.es.js",        // unchanged, still everything
       "./mcp":          "./dist/Mcp/index.es.js",    // Tool, ToolRegistry, ServerInfo, dispatch
       "./transport":    "./dist/Transport/index.es.js",
       "./stdio":        "./dist/vendors/stdioServer.es.js",
       "./content-tools":"./dist/Tools/index.es.js"   // where plgg-content stays
     }
   }
   ```

   The bundle already emits those directories; this is a packaging change, not
   a code one.
2. **Keep `.` exactly as it is** — every current consumer keeps working, and
   the change is additive.
3. **Move `plgg-content` to a peer/optional dependency**, or leave it a normal
   one: once `./mcp` and `./stdio` do not reach it, an unused dependency costs
   install time rather than a runtime built-in.
4. **Pin it**: a test that imports `plgg-mcp/stdio` and asserts `node:sqlite`
   is not in the module graph. Without one this regresses the first time
   someone adds a convenience re-export to a barrel.

## Quality Gate

- `bun -e "import('plgg-mcp/stdio')"` succeeds.
- A stdio server built from `plgg-mcp/mcp` + `plgg-mcp/stdio` with a
  consumer's own `ToolRegistry` answers `initialize`, `tools/list` and
  `tools/call` under **node and bun**.
- `import "plgg-mcp"` still resolves and still exposes `contentTools` —
  no existing consumer changes.
- plgg's own gate green.

## Considerations

- **This is packaging, and the layering it needs already exists.** The bundle
  emits `dist/Mcp`, `dist/Transport`, `dist/Tools` and `dist/vendors` as
  separate trees; only the single-entry `exports` map collapses them.
- **`node:sqlite` is node-only and experimental.** It prints an
  ExperimentalWarning on node ≥22 and does not exist on bun at all. Anything
  that wants `plgg-mcp` to be the substrate for a browser-adjacent or
  edge-deployed transport will meet this again, harder — a Worker has no
  `node:sqlite` either.
- **The default tool set is worth keeping default.** `.` exporting everything
  is the right ergonomic for a plggpress site; the ask is only that a consumer
  who registers its own tools can decline the ones it will not call.
