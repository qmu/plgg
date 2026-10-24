# Packed plgg-bundle with consumer TypeScript 7

Run `node scripts/gate-bundle-ts7-consumer.ts` from the repository root after
`npm ci`. The gate builds plgg-bundle, uses the publisher's staging helpers,
then runs `npm pack` and a real `npm install` into a fresh OS temporary directory.
Network access to the npm registry is required; no package is published.

The consumer pins TypeScript 7.0.2. The gate checks that the installed CLI
resolves its own TypeScript 6 compiler API, builds and executes this typed
multi-file app, and that the consumer's TypeScript 7 checks it successfully.
A deliberate TS2322 is also required to fail. Temporary files are removed even
on failure. `scripts/check-all.sh` runs this gate after the repository build.

Unlike qmu/plgg#165's manually copied compiler layout, this fixture exercises
npm's dependency nesting and the publisher's rewritten manifest. The release
version bump remains in that PR.
