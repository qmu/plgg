# Development environment

- Node >=24 (see `.nvmrc`). `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh` stop with a message on older Node.
- TypeScript: most packages use TS7 (native); `plgg-bundle` and `plgg-test` stay on TS6.
- `scripts/tsc-plgg.sh`: type-check one package.
- `node scripts/typecheck.ts [package...] [--jobs N]`: whole-repo gate, one `tsc -p --noEmit` per package.
- `scripts/test-plgg.sh`: run the tests.
