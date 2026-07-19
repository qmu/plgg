---
created_at: 2026-07-19T11:00:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort: 4h
commit_hash:
category: Added
depends_on:
mission: prove-metamodel-concept-on-plgg-ir
---

# The runnable proof command, vitest fixtures, and the guide doc

## Overview

Tie the passes and examples into the artefact the owner checks on landing: **one
command** that runs each flagship example through its verification pass and
prints, for the valid inputs, `accept`, and for the doctored ones, the
**counterexample trace**. Fix every verdict with vitest, wire the gate, write the
guide doc, and tick the mission acceptance.

## Key files

- `packages/plgg-ir-thesis-proof/src/prove.ts` (or `bin`/`npm run prove` entry) —
  the command: run 反論の完全性 (遮断 + 被覆) on the complete and doctored
  rebuttals, and Dung 生存判定 on the 論争空間; print a readable report.
- `packages/plgg-ir-thesis-proof/package.json` — a `prove` script so the owner
  runs it with one command from the package (document the exact command).
- `packages/plgg-ir-thesis-proof/src/**/*.spec.ts` — fixtures fixing: accept on
  complete 反論; 遮断 counterexample (`競合参入 →r3→ 撤退判断` surviving) and 被覆
  counterexample (r3 unattacked) on doctored; grounded extension
  `{外需回復論, 増税必要論}`.
- `docs/plgg-ir/proof-example.md` — the guide doc; link it from
  `docs/plgg-ir/guide.md` (or the docs index) so it is reachable.
- `.workaholic/missions/active/prove-metamodel-concept-on-plgg-ir/mission.md` —
  tick the satisfied Acceptance items (marker on the same line as `- [ ]`).

## Steps

1. Implement the command to load each example, run its pass, and print `accept`
   or the ranged counterexample trace; make the doctored-input rejection print
   the surviving derivation path verbatim.
2. Add vitest fixtures fixing all verdicts above; ensure package coverage >90%.
3. Run `./scripts/check-all.sh` green; capture the command's actual stdout.
4. Write `docs/plgg-ir/proof-example.md`: the metamodel claim, the example, the
   exact command, and a copied sample of the accept output and a counterexample
   trace. Link it from the plgg-ir docs so a reader reaches it.
5. Tick the mission Acceptance items now satisfied, append a dated Changelog line.

## Policies

- **Implementation — information/function reachable through multiple paths.** The
  proof is reachable three ways: the runnable command, the vitest fixtures, and
  the guide doc — a reader or agent reaches the demonstrated claim from any of
  them.
- **Operation — the running artefact is the acceptance surface.** The command is
  what the owner runs on landing; its output (accept + counterexample trace) is
  the observable proof, not a description of one.

## Quality Gate

- **Acceptance:** one documented command prints `accept` for the complete
  rebuttal and the 論争空間 survivors, and prints the surviving-path (遮断) and
  unattacked-relation (被覆) counterexamples for the doctored rebuttal; all
  verdicts fixed by passing vitest; the guide doc shows the command and a sample
  trace and is linked from `docs/plgg-ir/`. No `as`/`any`/`ts-ignore`.
- **Verification method:** run the command and confirm stdout matches the doc;
  run `./scripts/check-all.sh`.
- **Gate that must pass:** `./scripts/check-all.sh` green (guide dead-link check
  via `cd packages/guide && npm run build` if the doc lives under the guide).

## Considerations

- The owner explicitly wants "a running command + counterexample output" — make
  the counterexample the star of the output, not a buried log line.
- Keep the command dependency-free (no arg-parsing library); a plain entry that
  runs the fixed examples is enough for the acceptance surface.
