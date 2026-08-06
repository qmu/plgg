---
created_at: 2026-08-06T21:16:27+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
merge_policy: auto
---

# PoC フリートの 9 パッケージを撤去する

## Overview

`packages/plgg-poc*` の 9 パッケージ（`plgg-poc-portal` / `plgg-poc1-search` /
`plgg-poc2-agent` / `plgg-poc3-voice` / `plgg-poc4-edit` / `plgg-poc4b-coedit` /
`plgg-poc4c-livesite` / `plgg-poc5-config` / `plgg-poc6-classify`、計 142 の
`.ts` ファイル）を、その配線ごとリポジトリから撤去する。**開発者の判断
（2026-08-06）**であり、技術的な不具合の修正ではない。

これらは「確信を集める PoC フリート」として作られたもので、いずれも
`private: true`、npm 未公開、`plgg-poc*.qmu.dev` で配信されていた。2026-07-19 の
qfs ピボットで PoC フリート（コンテナ群）自体は既に消えており、残っているのは
ソースと配線だけである。

### 副次的に片付くもの

dependabot の open アラート 2 件（`sharp` < 0.35.0、libvips 由来の CVE-2026-33327
/ 33328 / 35590 / 35591、いずれも high）は**このチケットで消える**。`sharp` は
直接依存ではなく、`plgg-poc1-search` の devDependency である
`@huggingface/transformers` ^3.5.1 が引く推移依存だからである。

これは重要な副次効果であって、このチケットの動機ではない。動機は「PoC はもう
要らない」という判断で、脆弱性はその結果として消える。**逆にこの副次効果を
当てにして削除範囲を狭めないこと** — 例えば poc1-search だけ残すと `sharp` も
残る。

なお `overrides` で `sharp` を 0.35 以上にピン留めする道は検討したが採らない。
最新の `@huggingface/transformers@4.2.0` でも `sharp: ^0.34.5` を宣言しており
（キャレットは 0.x でマイナーを固定するので 0.35.x を含まない）、親の宣言を
越えたピン留めになるため、transformers 側の壊れ方が保証されないからである。
パッケージごと消えるなら、その判断自体が不要になる。

## Policies

- `workaholic:design` / `policies/sacrificial-architecture.md` — 「捨てて作り直す
  ことが通常の選択肢である」ように境界を引く。PoC はまさにその犠牲的単位であり、
  役目を終えたら消せることが設計の成立条件だった。今回はその回収。
- `workaholic:design` / `policies/vendor-neutrality.md` — `@huggingface/transformers`
  は PoC の node 側埋め込みでしか使われていない重い外部依存（browser 側は
  jsdelivr の CDN URL を直接読む）。撤去は依存の自由度を回復する方向。
- `workaholic:implementation` / `policies/directory-structure.md` — パッケージを
  消すときは、その配線（テストランナー、README 索引、workloads、CI）も同時に
  消す。片方だけ残ると「構造から場所が予測できる」性質が壊れる。
- `workaholic:implementation` / `policies/objective-documentation.md` — README の
  記述は実在するものを指していなければならない。9 行の索引エントリを残したまま
  パッケージを消すと、`gate-readme.sh` が落ちる（それが正しい）。
- `workaholic:operation` / `policies/ci-cd.md` — 緑になったことではなく、
  実際に何が検査されたかが証拠。ここでは「消し残りが無いこと」を grep で
  積極的に示す。

## Key Files

- `packages/plgg-poc-portal/`, `packages/plgg-poc1-search/`,
  `packages/plgg-poc2-agent/`, `packages/plgg-poc3-voice/`,
  `packages/plgg-poc4-edit/`, `packages/plgg-poc4b-coedit/`,
  `packages/plgg-poc4c-livesite/`, `packages/plgg-poc5-config/`,
  `packages/plgg-poc6-classify/` — 削除対象本体。
- `scripts/test-plgg-poc-portal.sh` ほか計 9 本の `test-plgg-poc*.sh` — 各
  パッケージ専用のテストランナー。パッケージと同時に消す。
- `scripts/serve-poc.sh` — PoC フリートの配信スクリプト。対象が全部消えるので
  スクリプトごと不要。**ルート `.env` を source する唯一の利用者**かどうかを
  確認してから消すこと（`.env` 規約に触れる）。
- `workloads/poc-portal/`, `workloads/poc1-search/` … `workloads/poc6-classify/`
  — 9 つの compose / Dockerfile / dev-entrypoint。同時に消す。
- `README.md` 135〜143 行 — パッケージ索引の 9 エントリ。`gate-readme.sh` が
  「実在する全パッケージが README にリンクされ、リンクが切れていないこと」を
  強制するので、消し残すとゲートが落ちる。
- `scripts/build.sh` — **29 パッケージを名前で列挙しており、PoC は 1 つも入って
  いない**。check-all のゲート順にも入っていない。つまり PoC フリートは既に
  「ゲートから外された」状態で、残っていたのはソースと配線だけ。この事実が
  この撤去のリスクを小さくしている（消してもゲートの構成は変わらない）。
  ただし `packages/*` の workspaces glob には入っているので、**ルートの
  lockfile には devDependency が流れ込んでいる** — それが `sharp` の経路。
- `~/.cloudflared/config.yml` — `plgg-poc*.qmu.dev` の ingress ルート。
  **これはリポジトリ外**（サーバの設定）なので、このチケットでは触らず、
  撤去が必要なら別途手当てする旨を Final Report に書く。

## Implementation Steps

1. 9 パッケージのディレクトリを削除する。
2. `scripts/test-plgg-poc*.sh` 9 本と `scripts/serve-poc.sh` を削除する
   （`serve-poc.sh` が他から呼ばれていないことを grep で確認してから）。
3. `workloads/poc*/` 9 ディレクトリを削除する。
4. `README.md` のパッケージ索引から 9 エントリを削除する。周辺の見出しや導入文が
   PoC フリートに言及していないか確認し、していれば整合させる。
5. ルートの `package-lock.json` を再生成する（`./scripts/npm-install.sh`）。
   `@huggingface/transformers` と `sharp` がロックから消えることを確認する。
6. リポジトリ全体を grep して消し残りをゼロにする。`.workaholic/` 配下の
   **アーカイブ済みチケット・ストーリー・フィードバック・リリースノート・
   ミッションは履歴なので触らない**（過去の記録が過去を指しているのは正しい）。

## Quality Gate

**Acceptance criteria**

- `ls -d packages/plgg-poc*` が何も返さない。
- `ls scripts/test-plgg-poc*.sh scripts/serve-poc.sh` が何も返さない。
- `ls -d workloads/poc*` が何も返さない。
- `grep -n "plgg-poc" README.md` が何も返さない。
- 履歴領域を除いた全体 grep が空:
  `git grep -l "plgg-poc" -- . ':!.workaholic/tickets/archive' ':!.workaholic/stories' ':!.workaholic/feedbacks' ':!.workaholic/release-notes' ':!.workaholic/missions'`
- `git grep -l "huggingface\|sharp" -- package-lock.json` が空、かつ
  `npm ls sharp` が何も見つけない。
- `./scripts/check-all.sh` が緑（exit 0）。特に `gate-readme.sh` が通ること
  （README 索引とパッケージ実体の対応が壊れていないことの機械的証明）。
- GitHub の dependabot アラートが 0 件になる:
  `gh api repos/qmu/plgg/dependabot/alerts --jq '[.[]|select(.state=="open")]|length'`
  が `0`。**マージ後に確認**すること（アラートは main の依存グラフで再評価される）。

**Verification method**

- 上記をそのままコマンドとして実行し、出力を Final Report に貼る。
- `./scripts/check-all.sh` を最後に 1 回。

**Gate**

- check-all 緑、かつ上の消し残り grep がすべて空。dependabot アラートの 0 件は
  マージ後の確認項目として報告に残す（マージ前には確定できない）。

`Decided:` **`overrides` による `sharp` のピン留めは行わない。** パッケージごと
消えるので不要であり、親が宣言していないバージョンを強制するリスクを負う理由が
無くなる（`/drive` で開発者が上書き可）。

`Decided:` **`.workaholic/` の履歴領域（archive / stories / feedbacks /
release-notes / missions）は書き換えない。** 過去の記録が当時存在したものを
指しているのは正しい状態で、遡って消すと履歴が嘘になる（`/drive` で開発者が
上書き可）。

`Decided:` **cloudflared の ingress（`plgg-poc*.qmu.dev`）はこのチケットでは
触らない。** リポジトリ外のサーバ設定であり、コード変更の受入と混ぜると
「緑なのに片付いていない」状態を作る。撤去が必要な事実だけ Final Report に
書き残す（`/drive` で開発者が上書き可）。

## Considerations

- **削除は一括で。これは好みではなく構造上の要請。** `plgg-poc2-agent` /
  `plgg-poc3-voice` / `plgg-poc4-edit` / `plgg-poc4b-coedit` /
  `plgg-poc4c-livesite` の 5 本が `plgg-poc1-search` に **`file:` 依存**して
  いる。poc1-search だけ残す/消すといった部分削除は依存を壊すか `sharp` を
  残すかのどちらかになる。加えて `plgg-poc-portal` は他の PoC を索引している
  のでリンク切れも出る。分割するなら portal を最後に消すこと。
- **`serve-poc.sh` とルート `.env`。** メモリ上、`serve-poc.sh` はルートの
  git-ignored `.env` を source する数少ない利用者。消したあとに `.env` の
  どのキーが誰にも読まれなくなるかを確認し、必要なら `.env.example` を整合させる。
- **workloads の podman コンテナ。** 停止・削除されていないコンテナが残っている
  場合、compose ファイルを消しても podman 側には残る。リポジトリの受入には
  含めないが、Final Report で状態を報告すること。
- **guide への影響は無い見込み。** `packages/guide/packages/` に poc のページは
  存在しない（確認済み）。ただし guide の本文が PoC に言及していないかは
  ビルドで dead-link 検査に掛かるので、`cd packages/guide && npm run build` も
  一度通しておくとよい。
