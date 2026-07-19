---
type: Mission
title: Prove a metamodel concept on plgg-ir (a runnable worked example)
slug: prove-metamodel-concept-on-plgg-ir
status: active
created_at: 2026-07-19T10:58:00+09:00
author: a@qmu.jp
assignee: a@qmu.jp
drive_authorized: true
tickets: []
stories: []
concerns: []
---

# Prove a metamodel concept on plgg-ir (a runnable worked example)

The qmu **概念メタモデル** (`strategy.qmu.dev/metamodel`, and its
`/metamodel-semantics` companion) claims that argumentation structures written in
its closed vocabulary — 主張 / 概念 / 関係 / フレーム / 論旨 / 論評 /
ストラクチャー — carry **statically checkable, formally verifiable** properties:
whether a rebuttal is complete, whether an argument begs the question, which
theses survive an attack graph. This mission makes that claim concrete and
**runnable**: a worked example on the plgg-ir stack that takes an argumentation
model in the metamodel vocabulary and **formally proves** a property, printing
`accept` or a **counterexample trace**, from one command.

## The direction (owner, 2026-07-19)

- **A running proof, not a spec.** The deliverable the owner checks on landing is
  a single command that verifies the flagship examples and prints, for a valid
  argument, `accept`; and for a deliberately broken one (one attack removed), a
  concrete **counterexample trace** (e.g. `導出経路 競合参入 →r3→ 撤退判断 が
  生き残っている`). Depth is real: the verification passes are graph/model
  checks over the actual `plgg-ir-thesis` model, not hand-waved verdicts.
- **Rides the real dialect.** This worktree is cut from the `plgg-ir-thesis`
  evaluator branch, so it has the thesis models (主張/関係/フレーム/攻撃 …), the
  `graph` util, and the analysis passes. The attack-completeness and
  survival passes this example needs are implemented here as concrete,
  test-fixed model checks (they realize the metamodel's headline properties;
  the sibling evaluator mission may grow richer general versions — convergence
  at merge is expected and fine, plgg being its own only consumer).
- **Cases (owner-delegated).** Anchor on the semantics doc's flagship
  **反論の完全性** — both **遮断** (severing: after removing attacked relations,
  no premise→root derivation path survives) and **被覆** (coverage: every
  relation has a declared attack) — on 撤退論 vs 継続論. Add **Dung 生存判定**
  (grounded extension) on the 論争空間 (増税必要論 / 景気失速論 / 外需回復論 →
  survivors {外需回復論, 増税必要論}). A third case (循環論証 / 論点先取
  detection) is welcome if it costs little.

## The dev environment

- Everything runs under the plgg gate: `./scripts/check-all.sh` (invoke with
  `./`, not `bash`) builds and tests the whole monorepo including the new
  example package against the in-repo `plgg-ir-*` siblings (`file:../<sibling>`).
- The proof command is the acceptance surface: it loads each flagship example,
  runs the verification pass, and prints `accept` or the counterexample trace.

## Experience

- **The claim is demonstrated, not asserted.** A reader runs one command and
  watches the verifier accept a complete rebuttal and, on a doctored input,
  print the surviving derivation path (遮断) or the un-attacked relation (被覆)
  as a ranged counterexample.
- **The model is the metamodel's.** The example is written in the metamodel's
  Japanese closed vocabulary — via the `plgg-ir-thesis` surface syntax where the
  dialect parses it, otherwise via the typed model builders — so the proof is of
  *the metamodel's concept*, not of an ad-hoc re-encoding.
- **Counterexamples are machine-usable.** Each rejection returns a ranged,
  human-readable trace of exactly why (surviving path / unattacked edge /
  defeated thesis), the same diagnostic shape plgg-ir uses everywhere.

## Acceptance

_Self-contained — drivable from this repo alone._

- [ ] A worked-example surface (package or demo entry) exists on the plgg-ir
      stack, builds under `./scripts/check-all.sh`, and reuses the
      `plgg-ir-thesis` model (主張 / 関係 / フレーム / 攻撃).
- [ ] **反論の完全性** is proven on 撤退論 vs 継続論: the complete
      `継続論による反論` is accepted; removing one attack yields a counterexample
      trace for both 遮断 (surviving derivation path) and 被覆 (unattacked
      relation). Fixed by a vitest fixture.
- [ ] **Dung 生存判定** (grounded extension) is computed on the 論争空間 example
      and returns the surviving set `{外需回復論, 増税必要論}`, fixed by a test.
- [ ] One command runs the examples end-to-end and prints `accept` for the valid
      inputs and the counterexample trace for the doctored ones (the artefact the
      owner checks on landing).
- [ ] A guide doc shows the example, the command, and a sample counterexample
      trace, reachable from `docs/plgg-ir/`.

## Out of scope

- The general `plgg-ir-thesis` evaluator (the sibling
  `build-the-plgg-ir-thesis-evaluator` mission owns the full model checker,
  `:要求` selection, and canonical IR). This mission builds a concrete runnable
  proof of specific cases, not the general engine.
- Publishing, weighted/gradual argumentation (second-version modal extensions),
  and the modal-logic engine beyond what the chosen cases need.

## Notes

- Base branch: cut from `plgg-ir-thesis` evaluator branch at `7633b08e`
  (T3 done), so the thesis models + `graph` util + per-assertion analysis are
  present; the attack-completeness and grounded-extension passes are built here.
- Sources: the flagship S-expressions live verbatim in the strategy book's
  `metamodel-semantics.md` (§反論の完全性, §検証カタログ 11 生存判定) — use them
  as the exact inputs and expected verdicts.

## Changelog

<!-- Append-only, dated timeline. -->
- 2026-07-19 — mission created — mission.md
- 2026-07-19 — ticket archived — 20260719110000-scaffold-proof-example-package.md
- 2026-07-19 — ticket archived — 20260719110001-verify-rebuttal-completeness-severing-coverage.md
- 2026-07-19 — ticket archived — 20260719110002-author-flagship-rebuttal-example.md
