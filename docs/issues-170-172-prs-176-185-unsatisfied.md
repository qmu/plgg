# 未充足の決定記録: issue #170–#172 と PR #176–#185

2026-10-25 時点。`main`（bba7ca80）の現物と、各 PR の差分・CI 状態（`gh`）を照合した。
コードは変更しない。**#173–#186 はどれも未 merge**なので、main に対しては下の「未充足」がそのまま残る。
充足とみなすのは「main に入り、かつ閉鎖条件を満たしたもの」だけ。

registry（npm）は再照会していない（この環境では外部アクセスが承認されない）。版は main の `package.json` の値。

## 照合結果

| 対象 | main の現物 | 担当 PR（状態） | 判定 |
| --- | --- | --- | --- |
| #170 Docker が `node:22-slim` | `workloads/guide/Dockerfile:12`, `workloads/development/Dockerfile:8` が 22 | #178（open, CI 成功）。両 Dockerfile と `infrastructure.md` を直す | 未充足。#178 の merge で受入基準 1・3 を満たす。compose 起動の実機確認（基準 2）は未 |
| #171 CI が Node 22 のみ | `run-tests.yml:26`, `deploy-guide.yml:45` が `22.x` | 無し（`workflows` 権限が要る。#183 も除外した） | 未充足。人か権限付き token が必要 |
| #172 `plgg-test` の consumer gate | `scripts/gate-test-npm-consumer.sh` 無し。`plgg-test` は runtime に `typescript ^6.0.3` | #186（open, **CI 失敗**）。#183 は Node 24 版の別 fixture（`check-all` 未接続） | 未充足。#186 の失敗を直す。#183 は #186 と重複 |
| #176 / #181 / #182 / #184 / #185 | docs のみ（コードを満たさない） | 5 本が同じ issue 群・同じ表を重複記録 | 何も満たさない。1 本に統合する（下記） |
| #175 / #177 | Node 24 gate 無し | open, **CI 失敗** | 未充足（#170–#172 の範囲外だが Node 24 行の前提） |
| #173 / #174 / #179 | `plgg-bundle` / `plgg` の gate 無し | open, CI 成功 | 未充足（merge 待ち） |

## パッケージ別の未充足

| パッケージ | main の版 | 未充足 | 満たす PR | 残る作業 |
| --- | --- | --- | --- | --- |
| `plgg-test` | 0.0.5 | TS7 consumer・npm consumer・Node 24 | #186（#183 は重複） | #186 の CI を緑にする。Node 24 は #171 待ち。版上げの要否は #186 後に判断 |
| `plgg-bundle` | 0.0.6 | 0.0.7 未公開（公開版にバグ） | #165, #173, #179 | merge、merge 前に人手で 0.0.7 を publish |
| `plgg` | 0.0.27 | Node 24 + TS7 tarball gate | #174, #175 | #175 の CI 失敗を直す |
| `plgg-md` | 0.0.3 | Node 24 + TS7 tarball gate | #177 | #177 の CI 失敗を直す |
| Docker 2 workload | — | Node 22 固定 | #178 | merge、compose 実機確認 |
| CI（全体） | — | Node 24 行列無し | 無し | #171（権限） |
| 他の公開パッケージ | — | gate・追跡 issue 無し | 無し | 本記録の範囲外。新規 issue が要る |

## 実装順

1. **#186 の CI 失敗を直す**（#172 の唯一の実装）。#183 は閉じるか、Node 24 fixture を #186 に畳む。
2. **#178 を merge**（#170）。`docker compose up` を guide（:5173）と example（:3000）で手動確認する。
3. **#175・#177 の CI 失敗を直す**。両者は `check-all.sh` の同じ挿入点で衝突するため #175 → #177 の順で rebase。
4. **docs を統合**: #185 か本記録を残し、#176・#181・#182・#184 は閉じる。
5. **#171**: 権限付き token か人の手で `run-tests.yml` を `["22.x","24.x"]` 行列に、`actions/*` を v5 に。`deploy-guide.yml` は単一ピンのまま。
6. 公開は人手（`.workaholic/deployments/npm.md`: merge 前に publish）。

`scripts/check-all.sh` は #165・#173・#174・#175・#177・#179・#186 が同じ場所を編集する。各 gate を残し、`build.sh` を先頭側に保って解決する。

## 閉鎖条件

| issue | 閉じる条件 | それだけでは足りない |
| --- | --- | --- |
| #170 | 両 Dockerfile が `node:24-slim`、compose 起動を両 workload で確認、`infrastructure.md` の「Docker 無し」行が消えている | #178 の merge のみ（実機確認が未） |
| #171 | `run-tests.yml` が 22.x/24.x の行列で緑になる | #183 や #186 の gate（CI 行列ではない） |
| #172 | `gate-test-npm-consumer.sh` が `check-all.sh` に接続され CI で緑（解決・実行・型検査の三段） | #186 を CI 失敗のまま merge、または #183 のみ |

## 未確認

- 各 PR の gate はこの環境で実行していない。CI の状態は `gh pr list` の statusCheckRollup による。
- registry の公開版は未照会。
