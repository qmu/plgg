# issue #171 の統合順と完了条件（workflows 権限の要るものと要らないもの）

2026-10-25 時点。open PR は未 merge。#171 は CI（`run-tests.yml`）を Node 24 で走らせる変更で、
`.github/workflows/` を触る open PR は 1 本も無い（#198 を含む全 open PR の変更ファイルを確認済み）。
既存の記録 #168（条件の分類）と #197（#170–#172 の照合）の続きとして、PR を権限で二分し、
権限なしで統合できる群の順序と完了条件を定める。コードは変更しない。

## 1. workflows 権限が要るもの

| 対象 | 内容 | 完了条件 |
| --- | --- | --- |
| #171 本体 | `run-tests.yml` の `check-all` を `fail-fast: false` の `["22.x", "24.x"]` 行列にし、`actions/checkout@v4`・`actions/setup-node@v4` を `@v5` に上げる。`deploy-guide.yml` は publish 系のため単一ピンのまま | 行列の両方が green。deprecation 警告（Node 20 ランタイム）が消える |

理由: GitHub App token（`corpd-6fad92[bot]`）に `workflows` 権限が無く、#160・#162 の push は
`refusing to allow a GitHub App to create or update workflow` で拒否された。エージェントの手順では
解消できない。権限を持つ人か別 token が 1 ファイル変更として入れる。

## 2. 権限なしで統合できるもの

`.github/workflows/` を変更しない PR。`run-tests.yml` は Node 22 のまま `scripts/check-all.sh` を
呼ぶので、ここに入る gate は Node 22 上で意味を持つか、Node 24 を自前で取得する必要がある。

### 2a. 単独で入り、`check-all.sh` の衝突が小さいもの（先に入れる）

| PR | 内容 | 現状（merge / CI） |
| --- | --- | --- |
| #165 | plgg-bundle 0.0.7、npm consumer gate（Fixes #155・#156） | CLEAN / SUCCESS。merge 後は人が `publish-npm.sh` を実行（developer-driven） |
| #160 | `node:sqlite` の 4 パッケージの `engines.node >=22.13` | CLEAN / SUCCESS |
| #162 | dependabot で typescript の semver-major を ignore | CLEAN / SUCCESS |
| #169 | gate 失敗時に解決先 tsc を表示 | CLEAN / SUCCESS |
| #178 | guide・development の Docker を Node 24 へ（#170 の一部） | CLEAN / SUCCESS |
| #163 | TS6/7 split-version invariant の gate | CLEAN / SUCCESS。`check-all.sh` に 1 行 |
| #173 | plgg-bundle の連続 build 回帰 gate（#155） | CLEAN / SUCCESS。`check-all.sh` に 1 行 |

### 2b. 同じ目的の gate が重なるもの（統合前に一本化を決める）

公開 tarball × Node 24 × consumer TypeScript 7 の gate が 10 本以上ある。各 PR が `check-all.sh` に
別々の位置で 1–2 行を足すため、順に rebase が要る。

| PR | 検査対象 | 現状 |
| --- | --- | --- |
| #174 | 公開 plgg tarball を consumer の TS7 で transpile（手元 pack） | CLEAN / SUCCESS |
| #175 | 公開 plgg を Node 24 + consumer TS7（自前で Node 24 取得） | UNSTABLE（CI 失敗） |
| #177 | 公開 plgg-md を Node 24 + consumer TS7 | UNSTABLE（CI 失敗） |
| #179 | 手元の plgg-bundle を隔離 TS7 consumer で | CLEAN / SUCCESS |
| #186 | 公開 plgg-test を consumer TS7 で（#172） | UNSTABLE（CI 失敗） |
| #188 | plgg-parser を隔離 Node 24 / TS7 consumer で | CLEAN / SUCCESS |
| #191 | 公開 tarball の確認を Node 24 / consumer TS7 gate に一本化すると宣言 | CLEAN / SUCCESS |
| #192 | guide・development の container 起動（#170） | CLEAN / SUCCESS。Node 24 の gate ではなく起動確認 |
| #198 | packed plgg-router の consumer gate（Node 24、TS7） | CLEAN / SUCCESS |
| #183 | packed plgg-test の Node 24 fixture（`check-all.sh` 未接続） | CLEAN / SUCCESS |
| #195 | plgg-test の live engine を Node 24 で gate（`test-plgg.sh` を変更） | CLEAN / SUCCESS |

判断を要する点: #191 が「統一 gate」を名乗るため、#174・#175・#177・#179・#186・#188・#198 との
重複をどう扱うか。閉じる・差し替えるは PR の状態を変える操作なので、人の判断を仰ぐ。

## 3. 統合順

1. #165 を merge → 人が `PREFLIGHT=1 ./scripts/publish-npm.sh` → `./scripts/publish-npm.sh`。
   完了条件: npm registry の `plgg-bundle` が `0.0.7` を返す。
2. 2a の PR を順に merge（#160・#162・#169・#178 は独立。#163・#173 は `check-all.sh` の 1 行を
   足すため、先の merge 後に rebase）。完了条件: 各 PR の CI が green。
3. 2b の一本化を決定 → 採用する gate の PR の CI を green にする（#175・#177・#186 の失敗原因は
   本記録の範囲で未調査）。完了条件: `check-all.sh` の Node 24 / TS7 gate が重複せず、CI が green。
4. #171 本体を `workflows` 権限を持つ人が入れる。完了条件: 行列 `22.x` と `24.x` が両方 green、
   deprecation 警告が消える。入った時点で、3 で入れた Node 24 自前取得が冗長かを判断する。
5. #170 の Dockerfile（`node:22-slim`）を、4 の行列の判断（22 を残すか）に従って見直す。

## 未確認

- 各 PR の衝突は `check-all.sh` の挿入位置からの推定で、実際の rebase は行っていない。
- #175・#177・#186 の CI 失敗の原因は調べていない。
- npm registry の再照会はしていない（`plgg-bundle` の現在の公開版は未確認）。
- 22.x を支持下限として残すかは未決（#160 の floor `>=22.13` の前提）。
