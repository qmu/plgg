THE MOST IMPORTANT RULE - `as` `any`, and `ts-ignore` is STRICTLY PROHIBITED as a solution to type errors under any circumstances.

* Fix compilation error with `scripts/tsc-plgg.sh`.
* Test with `scripts/test-plgg.sh`.
* Format with Prettier; every package carries its own `.prettierrc.json` (`printWidth: 50`) — don't hand-pack onto fewer lines.
* House coding style (type-driven design, Option/Result, exhaustive `match`, the no-escape-hatch rule) lives in the `plgg-coding-style` skill — follow it when writing any `packages/` TypeScript.

## The plggmatic reference (dev environment)

`packages/plggmatic` is the family's horizontal-orientation UI framework; `packages/plggmatic-example` is its reference (demo1). Develop the reference with hot reload:

* Serve: `cd packages/plggmatic-example && npm run dev` → `http://localhost:51820` (plgg-bundle dev server; `bundle.config.ts` carries the `dev` section — port 51820, watch `src`, allowed hosts `localhost` and `plggmatic-reference.qmu.dev`). An edit under `src/` rebuilds and the browser reloads over SSE.
* Live at `https://plggmatic-reference.qmu.dev` through the shared `qmu-dev` tunnel.
* Build the exhibit: `cd packages/plggmatic-example && npm run build`.
* plggmatic publishes to npm **from this repo** (0.2.1 forward; `repository` is `qmu/plgg`); publishing is a gated release step. The direction and acceptance live in the `grow-plggmatic-as-the-reference-framework` mission.
