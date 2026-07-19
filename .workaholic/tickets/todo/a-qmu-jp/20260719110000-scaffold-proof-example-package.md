---
created_at: 2026-07-19T11:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort: 2h
commit_hash:
category: Added
depends_on:
mission: prove-metamodel-concept-on-plgg-ir
---

# Scaffold the proof worked-example package on the plgg-ir stack

## Overview

Create the package that hosts the runnable formal-proof example, wired into the
monorepo gate, depending on `plgg-ir-thesis` (models: 主張/関係/フレーム/攻撃,
plus the `graph` util). Name it `plgg-ir-thesis-proof` (a worked example, not a
new dialect). This ticket only stands the package up with a compiling stub and a
placeholder `prove` entry; the verification passes and examples come next.

## Key files

- `packages/plgg-ir-thesis-proof/package.json` — intra-repo deps as
  `file:../plgg-ir-thesis`, `file:../plgg-ir-language`, `file:../plgg-ir-syntax`,
  `file:../plgg` (mirror a sibling plgg-ir package's package.json exactly;
  omit `type: module`, set `rootDir: src` per the new-package scaffold notes).
- `packages/plgg-ir-thesis-proof/tsconfig.json`, `.prettierrc.json` (printWidth 50).
- `packages/plgg-ir-thesis-proof/src/index.ts`, `src/domain/…` following the
  sibling layout (domain/model, domain/usecase).
- `scripts/check-all.sh` — add the new package to the build/test set the way the
  other `plgg-ir-*` packages are listed.
- Reference a sibling: `packages/plgg-ir-thesis/package.json` and its `src/` tree.

## Steps

1. Copy a sibling `plgg-ir-*` package's `package.json` / `tsconfig.json` /
   `.prettierrc.json` and adapt name + deps (do NOT clone garbage — match the
   real sibling shape; add `plgg-ir-thesis` as a `file:` dep).
2. `src/index.ts` re-exports the domain barrel; add a trivial typed value that
   imports something from `plgg-ir-thesis` so the dependency compiles end-to-end.
3. Install and build: from the repo root run the install the other packages use,
   then rebuild `plgg-ir-thesis` dist first (consumers read the barrel), then
   this package.
4. Wire the package into `./scripts/check-all.sh` and confirm it builds there.

## Policies

- **Implementation — machine-checkable domain reasoning.** The package exists to
  make the metamodel's argument properties statically checkable; scaffold it so
  the type-driven passes have a home compiled against the real thesis model.
- **Development — zero new external deps.** Reuse the in-repo `plgg-ir-*`
  siblings via `file:`; add no third-party dependency.

## Quality Gate

- **Acceptance:** `packages/plgg-ir-thesis-proof` builds standalone and under
  `./scripts/check-all.sh`; it imports and type-checks against `plgg-ir-thesis`;
  no `as`/`any`/`ts-ignore`.
- **Verification method:** run the package build, then `./scripts/check-all.sh`.
- **Gate that must pass:** `./scripts/check-all.sh` green.

## Considerations

- Follow the new-package scaffold gotchas (omit `type: module`, `rootDir: src`,
  rebuild the thesis dist before this package reads its barrel).
- Keep the package minimal here; verification logic lands in the next tickets.
