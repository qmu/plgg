# issue #170–#172: PR #173–#196 時点での未充足の棚卸し

2026-10-25 時点。`main`（`bba7ca80`）は #173–#196 のどれも未 merge。
qmu/plgg#187（`docs/issues-170-172-prs-176-185-unsatisfied.md`）は同じ照合を #185 までで止めている。
本記録はその続きとして #186–#196 を追加で照合し、**既存 PR で覆われていない条件だけ**を記録する。
コードは変更しない。新しいゲート・修正の追試はしていない（既存 PR の CI を直す作業はここでは行わない）。

## 照合結果（#170–#172 のみ）

| issue | 内容 | 担当する既存 PR | 判定 |
| --- | --- | --- | --- |
| #170 | `workloads/guide`・`workloads/development` の Dockerfile が `node:22-slim` 固定 | #178（Dockerfile 2 本 + `infrastructure.md`、CI 成功）＋ #192（`scripts/gate-workload-startup.sh` で `docker compose up` を `check-all.sh` に接続、CI 成功）。両 PR は変更ファイルが重複しない | **覆われている**。#178 の受入基準2（compose 実機確認）は #192 の CI ゲートが place-of-record になる。新規 PR は不要 |
| #171 | CI（`run-tests.yml`・`deploy-guide.yml`）が Node 22 のみで、一度も Node 24 を実行しない | 無し。`.github/workflows/` を変更する PR は #173–#196 のどれにも存在しない（確認済み：全 24 本の変更ファイル一覧に `.github/workflows/` は 1 件も出てこない） | **覆われていない**。issue 本文が記す通り、GitHub App token に `workflows` 権限が無く、コードを書く形では着手できない。人か権限付き token が必要で、新しい PR を立てても同じ理由で push が拒否される |
| #172 | `plgg-test` に `plgg-bundle`（#165）同等の npm-consumer 回帰ゲートが無い | #183（Node 24 fixture、`check-all.sh` 未接続）＋ #186（`scripts/gate-test-npm-consumer.sh`、issue の受入基準3点＝解決・実行・型検査を #165 と同じ形で実装し `check-all.sh` に接続、CI **失敗中**）＋ #195（公開 npm 上の `plgg-test@0.0.5` 実体に対する追加のライブ検証。#183・#186 を置き換えない旨を PR 本文で明記） | **覆われている**。#186 が issue の受入基準に一致する実装を既に提出済み。CI が赤いままだが、それは #186 自身の修正対象であり、新規 PR を立てる対象ではない |

## 結論

#170–#172 の範囲で、既存の PR（#173–#196）に覆われていない Node 24 / TypeScript 7 条件は **#171 の CI 行列のみ**。
#170 と #172 は既にそれぞれ 1 本以上の PR が実装を提出済みであり、新しい実装 PR を追加すると #176/#181/#182/#184/#185 のような重複を増やすだけになる。

## 残る作業

- #171: `workflows` 権限を持つ token か、人の手による `run-tests.yml` の `["22.x","24.x"]` 行列化・`actions/checkout@v4`→`v5`・`actions/setup-node@v4`→`v5` の反映を待つ。`deploy-guide.yml` は単一ピンのまま（#171 本文が明記）。
- #170: #178・#192 の merge を待つ（どちらも CI 成功・MERGEABLE）。
- #172: #186 の CI 失敗の原因修正を待つ（本記録の範囲外）。

## 未確認

- npm registry の再照会はしていない（#195 の本文にある公開 `plgg-test@0.0.5` の失敗記述を転記したのみ）。
- `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh` はこの変更に対して実行していない。本 PR は Markdown のみで、`packages/` 配下のコードを変更していない。
