# Development

## Prerequisites

- Node.js 24 or newer (`.nvmrc` pins 24; root `package.json` `engines.node` is `>=24`).
- TypeScript 7 (native compiler) is the default for most packages. `plgg-bundle` and `plgg-test` still declare TypeScript 6.

## Type checking

- One package: `scripts/tsc-plgg.sh`.
- Whole repository: `node scripts/typecheck.ts`. It spawns one `tsc -p --noEmit` per package, each with its own declared TypeScript, in a bounded process pool. Pass package names to narrow it and `--jobs N` to pin concurrency.

On a fresh clone, build `plgg` and `plgg-test` first so their declarations exist.

## Tests

- `scripts/test-plgg.sh`. Package `test` scripts no longer run `tsc`.

## Formatting

- Prettier, with each package's own `.prettierrc.json` (`printWidth: 50`).
