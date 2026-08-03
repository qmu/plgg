// In-house bundler config for plgg-test's published
// dist. Two entries:
//
//  - `index` — the library API (`import { test, expect }
//    from "plgg-test"`), ESM + CJS, per-file `.d.ts` tree.
//  - `hook` — the ESM resolver hook (`src/Resolve/hook.ts`)
//    the RUNNER registers. It is compiled for exactly one
//    reason: in a real registry install Node loads a
//    registered hook with DEFAULT resolution, and it
//    refuses to strip types from a `.ts` under
//    node_modules. The hook is therefore the one file that
//    cannot go through the hook, and it was the whole
//    reason the retired bin/relocate.mjs copied the package
//    to /tmp. With it compiled, everything else `.ts`
//    (this package's src, the CLI entry, the target's
//    specs) loads through the hook's own transpiling
//    `load`. `src/Resolve/register.mjs` picks this dist
//    under node_modules and the `.ts` source in the
//    monorepo. Its `.cjs.js` sibling is unused — the
//    loader thread only ever imports the ESM one — but the
//    formats list is per-config, not per-entry.
//
// Externals (plgg, typescript + node:*) are derived from
// package.json, so the compiled hook still resolves its
// `typescript` import from node_modules at runtime.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "hook", input: "Resolve/hook.ts" },
  ],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-test", srcRoot: "src" },
};
