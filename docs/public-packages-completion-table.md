# 公開パッケージごとの完了条件（Node 24 / TypeScript 7 / npm consumer / 公開版）

2026-10-25 時点。`main`（bba7ca80）の現物と、#168・#176・#180 の記述を照合して一表に統合した。
コードは変更していない。表の各行は、`packages/*/package.json` の現物（版・`typescript`・`engines.node`）から取った。

## 読み方

- **Node 24**: 公開版（または packed tarball）を Node 24 上で install・実行する gate があるか。現在の CI は `run-tests.yml` / `deploy-guide.yml` とも `node-version: "22.x"` のみ（[#171](https://github.com/qmu/plgg/issues/171)）。
- **TypeScript 7**: 利用側が TypeScript 7 を devDependency に持つ状態で、そのパッケージを import・transpile できるか。
- **npm consumer**: scratch consumer に registry（または packed tarball）から install して実行する gate があるか。
- **公開版の完了条件**: 版が上がっていて、merge 前に developer が `scripts/publish-npm.sh` で publish し、公開版に対して上の gate が green になること（`.workaholic/deployments/npm.md` の順序に従う）。

「予定 #N」は open PR が gate を足す予定であることを示す。merge され CI で走るまでは検査済みではない。

## 一表（公開 27 件）

`private: true` の 3 件（`@plgg/example`・`@plgg/guide`・`@plggmatic/example`）は除外した。
公開版の列は、レジストリを再照会していない（下記「未確認」）。

| パッケージ | main の版 | typescript | engines.node | Node 24 | TypeScript 7 | npm consumer | 公開版の完了条件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `plgg` | 0.0.27 | dev `^7.0.2` | — | 予定 #175（CI 時のみ） | 予定 #175、手元 tarball は #174 | 予定 #175（registry） | registry の版を確認し、#175 が公開版に対して green |
| `plgg-md` | 0.0.3 | dev `^7.0.2` | — | 予定 #177（CI 時のみ） | 予定 #177 | 予定 #177（registry） | 同上。#159・#161 の変更に対する版上げは未照合 |
| `plgg-bundle` | 0.0.6 | runtime `^6.0.3` | — | 予定 #165（CI 時のみ）、#173 が連続 build | #165（TS7 consumer）、#179（packed） | #165 `gate-bundle-npm-consumer.sh`、#179 | 0.0.7 を #165 で bump し、merge 前に publish（未公開と #176 が記録） |
| `plgg-test` | 0.0.5 | runtime `^6.0.3` | `>=22.6` | 未 | 未（#156 と同形。[#172](https://github.com/qmu/plgg/issues/172) は起票のみ） | 未（#172） | gate が無い。#172 を入れてから版上げの要否を判断 |
| `plgg-view` | 0.0.2 | dev `^7.0.2` | — | 未 | 未 | 未 | #166 で 0.0.3、#164 と同一 release。#157・#158 の検査は無い |
| `plgg-auth` | 0.0.1 | dev `^7.0.2` | `>=22.6`（#160 で `>=22.13`） | 未 | 未 | 未 | 版 0.0.1 の公開状況は未確認。#160 merge 後に engines を反映 |
| `plgg-db-migration` | 0.0.2 | dev `^7.0.2` | `>=22.6`（#160 で `>=22.13`） | 未 | 未 | 未 | 公開状況は未確認。#160 merge 後に engines を反映 |
| `plgg-cms` | 0.0.3 | dev `^7.0.2` | —（#160 で `>=22.13` 追加予定） | 未 | 未 | 未 | 公開状況は未確認。#160 merge 後に engines を反映 |
| `plgg-sql` | 0.0.1 | dev `^7.0.2` | —（#160 で `>=22.13` 追加予定） | 未 | 未 | 未 | 公開状況は未確認。#160 merge 後に engines を反映 |
| `plggmatic` | 0.2.2 | dev `^7.0.2` | — | 未 | 未 | 未 | 公開状況は未確認。publish は本 repo から行う（CLAUDE.md） |
| `plgg-fetch` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-http` | 0.0.2 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-token-metering` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-mcp` | 0.0.2 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-foundry` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plggpress` | 0.0.4 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-cli` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-ir-thesis-proof` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-server` | 0.0.4 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-ir-syntax` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-parser` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-router` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-kit` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-ir-manifest` | 0.0.2 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-ir-thesis` | 0.0.1 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-ir-language` | 0.0.2 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |
| `plgg-highlight` | 0.0.3 | dev `^7.0.2` | — | 未 | 未 | 未 | gate・追跡 issue とも無し。公開状況は未確認 |

集計: Node 24 の gate が予定されているのは 3 件（`plgg`・`plgg-md`・`plgg-bundle`）。TypeScript 7 と npm consumer の gate が予定されているのも同じ 3 件。残る 24 件は gate も追跡 issue も無い（`plgg-test` のみ #172 で起票済み）。

## 関連する Docker・CI の行（パッケージではない）

| 対象 | 現状 | 追跡 |
| --- | --- | --- |
| `.github/workflows/run-tests.yml`・`deploy-guide.yml` | `node-version: "22.x"` のみ | #171（workflows 権限待ち）。CI 側の Node 24 は全パッケージの Node 24 行の前提 |
| `workloads/guide/Dockerfile`・`workloads/development/Dockerfile` | `FROM node:22-slim` | #170（起票）、#178（Node 24 化の open PR） |

## 照合で分かった食い違い

1. **publish の順序。** #168 の実装順は「#165 を merge → publish」だが、`.workaholic/deployments/npm.md` は「publish は merge の前に developer が行う PRE-merge gate」と定める。この表は npm.md に従う。#181 も同じ判断を取っている。
2. **#165 の close キーワード。** #176 の判断 3 は「#165 に `Fixes #155` が無い」とするが、現在の #165 の題名は「(Fixes #155, #156)」で、もう解消している。#176 の該当行は古い。
3. **Docker の扱い。** #168 の条件 G と #170 の本文は「どの open PR も Docker を触っていない」とするが、#178（「Use Node 24 for guide and development Docker workloads」）が open で、#170 の対象に当たる。
4. **版数の数え方。** #168 の PR 本文は「31 manifest」、同ドキュメントは「30 manifest」とする。`packages/` には 30 件（公開 27・private 3）があり、ルートの `package.json` を足すと 31 になる。表は `packages/` の 30 件を数えた。
5. **#176 と #181 の重複。** #181 は #176 と同じ 4 issue を扱う。#181 の本文は「どちらか一方を残す」としている。

## 未確認

- **公開版（npm の latest）は再照会していない。** 版の列は main の `package.json` の値で、registry の値は #176 と #180 が記録した「0.0.6（plgg-bundle）」「0.0.2（plgg-view）」などを引いた。この作業環境では registry への外部アクセスが承認されず、確認できなかった。
- Node 24 の gate（#165・#175・#177）は `CI=true` か `GATE_*=1` のときだけ走る。ローカルで Node 24 を確かめた行は無い。
- 表の行は、open PR の差分を読んだものではなく、PR の本文と main の現物で照合した。PR が merge された時点で、この表を更新する。
