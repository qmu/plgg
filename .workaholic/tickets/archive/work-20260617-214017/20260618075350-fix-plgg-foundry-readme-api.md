---
created_at: 2026-06-18T07:53:50+09:00
author: a@qmu.jp
type: housekeeping
layer: [Domain]
effort: 0.5h
commit_hash: f868872
category: Changed
depends_on:
---

# Fix stale API in plgg-foundry README

## Overview

`packages/plgg-foundry/README.md` documents an API that no longer matches the
shipped source. The README uses `makeFoundrySpec` / `makeProcessorSpec` /
`makeSwitcherSpec` / `makePackerSpec`, an `apiKey` field on the foundry spec, an
order `{ prompt }`, and the OO-style `result.isOk()` / `result.content`. The
shipped surface is:

- `makeFoundry({ description, apparatuses, provider?, maxOperationLimit? })`
- `makeProcessor({ name, description, arguments?, returns?, fn })`
- `makeSwitcher(...)`, `makePacker(...)`
- `runFoundry(foundry)(input: string | OrderSpec)`, where `OrderSpec` is
  `{ text, files? }` (not `{ prompt }`)
- results are folded as **values** (`matchResult` / `isOk` from plgg), not via a
  `result.isOk()` method
- the LLM `provider` comes from `plgg-kit` (`openai`/`anthropic`/`google`),
  defaulting to `openai("gpt-5.1")` — not an `apiKey` string on the spec

Bring the README (Quick Start, Complete Example, API Reference, and the
`result.isOk()` usages) in line with the current source. Discovered while
writing the VitePress guide, whose
[plgg-foundry page](packages/guide/packages/plgg-foundry.md) already documents
the correct surface; this ticket fixes the canonical package README.

## Key Files

- `packages/plgg-foundry/README.md` — the file to fix (Quick Start ~lines 26–68,
  Complete Example ~lines 105–201, API Reference ~lines 218–360).
- `packages/plgg-foundry/src/Foundry/model/Foundry.ts` — `makeFoundry` spec
  (`description`, `apparatuses`, optional `provider` defaulting to
  `openai("gpt-5.1")`, `maxOperationLimit`).
- `packages/plgg-foundry/src/Foundry/model/{Processor,Switcher,Packer}.ts` —
  `makeProcessor` / `makeSwitcher` / `makePacker` signatures.
- `packages/plgg-foundry/src/Foundry/usecase/runFoundry.ts` —
  `runFoundry(foundry)(input: string | OrderSpec)` and the `blueprint`→`operate`
  `proc` flow.
- `packages/plgg-foundry/src/Foundry/model/Order.ts` — `OrderSpec = { text,
  files? }`.
- `packages/plgg-foundry/src/Example/ProfileFoundry.ts` — the real, tested
  example (`makeFoundry` + `makeProcessor`, decode with a `cast`-based guard);
  base the README's worked example on this.
- `packages/plgg-kit/src/LLMs/model/Provider.ts` — `openai`/`anthropic`/`google`
  provider constructors for the `provider` field.

## Implementation Steps

1. Rewrite the Quick Start to use `makeFoundry`/`makeProcessor` +
   `runFoundry(foundry)(prompt)`, taking the `provider` from `plgg-kit` (or
   relying on the `openai("gpt-5.1")` default) rather than an `apiKey` field.
2. Replace every `make*Spec` name with the shipped `make*` name throughout
   (Quick Start, Complete Example, API Reference headings).
3. Replace `result.isOk()` / `result.content` usages with value-style folding
   (`isOk(result)` / `matchResult(...)` from plgg).
4. Correct the order shape to `{ text, files? }` (was `{ prompt }`), and the
   foundry spec fields to `{ description, apparatuses, provider?,
   maxOperationLimit? }`.
5. Prefer rebuilding the worked example from `Example/ProfileFoundry.ts` so it
   stays tested and correct.
6. Keep the conceptual sections (Foundry/Order/Alignment/Medium, register
   machine, how-it-works) — only the code and the API names are wrong.

## Considerations

- Documentation-only change; no source edits
  (`packages/plgg-foundry/README.md`).
- plgg-foundry is the most experimental package (skipped tests / study work) —
  preserve the maturity caveats while correcting the API.
- Samples must come from real, tested code (the house rule); base them on
  `Example/ProfileFoundry.ts` and the shipped `make*`/`runFoundry` signatures,
  not memory.
- Sibling housekeeping to the plgg-core README `match` fix
  ([[20260618075349-fix-plgg-readme-match-curried]]); both correct stale package
  READMEs surfaced by the guide work, but they touch different files and have no
  ordering dependency.

## Final Report

Development completed as planned. Aligned `packages/plgg-foundry/README.md` with
the shipped source: globally renamed `make*Spec` → `make*`, rewrote the Quick
Start and Complete Example to `runFoundry(foundry)(input)` with the plgg-kit
`provider` (default `openai("gpt-5.1")`) instead of an `apiKey` field, replaced
`result.isOk()` method calls with value-style `isOk`/`matchResult`, corrected the
order shape to `{ text, files? }`, and fixed the API-reference signatures. The
conceptual sections (Core Concepts, register machine, How It Works, Best
Practices, Limitations, Troubleshooting) were preserved.

### Discovered Insights

- **Insight**: `VirtualTypeSpec` *is* a real exported type (used in the
  `make*` signatures as `Dict<VariableName, VirtualTypeSpec>`), so the
  `### …Spec` argument/return headings and `VirtualTypeSpec` code references are
  correct and were intentionally left — only the `make*Spec` *factory* names and
  the `apiKey`/`{ prompt }`/`.isOk()` usages were stale.
- **Insight**: `makeFoundry` carries the `provider`; `runFoundry` is curried
  `runFoundry(foundry)(input)` and takes a bare prompt string or an
  `OrderSpec { text, files? }`. The README previously threaded `{ spec, provider }`
  into `runFoundry`, which never matched the shipped `runFoundry(foundry)(...)`.
