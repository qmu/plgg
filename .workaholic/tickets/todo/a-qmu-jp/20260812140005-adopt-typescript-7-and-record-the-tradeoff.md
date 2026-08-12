---
created_at: 2026-08-12T14:00:05+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260812140004-port-the-typecheck-gate-to-typescript-7.md]
mission: typescript-7-migration
merge_policy: auto
---

# TS7 を正式採用し、ネイティブバイナリのトレードオフを数字で残す

## Overview

先行 3 枚でコンパイラ API の利用箇所がすべて TS7 で動くようになった状態を
受けて、**採用を確定させる**。29 の `packages/*/package.json` の
`"typescript": "^6.0.3"` を 7 系に上げ、ルート lockfile を再生成し、
dependabot PR #112 を始末する。

同時に、このミッションが最初から抱えていた問いに数字で答える:
**20 個のネイティブバイナリを受け入れる価値があったか**。このリポジトリは
過去に rolldown の darwin 限定バインディングで CI を壊し、vite を落とす作業
自体が「そのクラスの依存を排除するためにあった」と記録している
（`packages/plgg-bundle/DEPENDENCY-LOG.md`）。**即 NG にはしない**が、
計らずに受け入れることもしない（開発者判断 2026-08-12）。

## Policies

- `workaholic:design` / `policies/vendor-neutrality.md` — 依存の決定は記録する。
  ネイティブバインディングの再導入は、意図して排除したクラスへの復帰なので、
  **依存決定ログに理由と計測値を残す**のが最低条件。
- `workaholic:implementation` / `policies/objective-documentation.md` — 記録は
  実測で書く。「速くなった」ではなく秒数。
- `workaholic:operation` / `policies/ci-cd.md` — 採用の証拠は、緑の CI では
  なく**本番相当の経路が期待どおり応答すること**。ここではガイドのデプロイまで
  含めて確認する。
- `workaholic:implementation` / `policies/directory-structure.md` — 決定記録は
  `docs/` と依存決定ログに置く。新しい置き場所を作らない。
- `workaholic:implementation` / `policies/type-driven-design.md` — **ドメインの
  レンズを明示的に引く。** ドメインのファイルは 1 行も変わらないが、型検査器を
  入れ替える以上、ドメインが依存している型レベルの保証そのものが賭けの対象に
  なる。「新しいコンパイラが行わなくなった検査」は**赤ではなく緑を返す**ので、
  ゲートが通ったことは何の証拠にもならない。
- `workaholic:safety` / `policies/risk-management.md` — decline した場合、
  「6.x に留まる」は名前を付けて受容するリスクであり、期限とともに記録する。
- **注記: `.workaholic/constraints/project.md` の Dependency Currency は
  このチケットに適用されない。** 同制約は "security-relevant packages" と
  "a package with a known CVE" に限定されており、TS 7.0.2 に CVE は無い。
  **30 日の時計は動いていない。** #112 の始末は衛生であって締切ではない。

## Key Files

- 29 の `packages/*/package.json` — `"typescript": "^6.0.3"` を宣言。
- `package-lock.json` — ルートの唯一の lockfile。
- `packages/plgg-bundle/DEPENDENCY-LOG.md` — 依存決定ログ。ネイティブ
  バインディングを排除した経緯が書かれている当のファイル。**ここに追記する。**
- `docs/typescript-7-api-gap.md` — スパイクの成果。最終的な結論を追記する。
- `.github/workflows/run-tests.yml` / `deploy-guide.yml` — CI。Node 22.x。
  ネイティブバイナリが CI ランナーで解決されることの確認先。
- dependabot PR #112 — 始末する対象。

## Implementation Steps

1. 29 manifest の `typescript` 範囲を 7 系に更新する。
2. `./scripts/npm-install.sh` でルート lockfile を再生成する。
3. `./scripts/check-all.sh` を通す。
4. トレードオフを計測し、`packages/plgg-bundle/DEPENDENCY-LOG.md` に追記する:
   - `node_modules` のサイズ（6.0.3 / 7.x）
   - クリーン install の wall clock
   - `node scripts/typecheck.ts` の 1 回目 / 2 回目
   - `./scripts/build.sh` の wall clock
   - `./scripts/check-all.sh` 全体の wall clock
   - どのプラットフォームバイナリが実際に install されたか（`npm ls` で確認）
5. `docs/typescript-7-api-gap.md` に最終結論を追記する（何を移植し、何が
   unstable API 依存として残ったか）。
6. PR #112 を、このミッションの成果に置き換わった旨のコメントを添えて閉じる。
7. CI（`run-tests.yml`）が実際に緑になることを確認する — **ローカルで通ることは
   CI ランナーでバイナリが解決されることの証拠にならない**。

## Quality Gate

**Acceptance criteria**

- `git grep -c '"typescript": "\^6' packages/*/package.json` が **0**。
- `npm ls typescript` がルートで 7 系を返す。
- `./scripts/check-all.sh` が緑（exit 0）。
- `packages/plgg-bundle/DEPENDENCY-LOG.md` に、上記 6 項目すべての
  **6.x / 7.x 比較の実測値**が載っている。空欄・推定値・「およそ」は不可。
- **CI が緑**であること — PR 上の `check-all` ワークフローが pass したこと。
  ローカルの緑では代替しない。
- **負の対照コーパスが通らないこと。** 「コンパイラが行わなくなった検査」は
  緑として現れるので、緑は証拠にならない。**コンパイルが失敗しなければならない**
  ファイル群を用意し、TS7 でも確かに拒否されることを示す。最低限:
  (a) `as` によるキャスト、(b) 網羅していない `never` 分岐、(c) ブランド型の
  バイパス、(d) `Option` が要求される位置での裸の `null`。各ケースについて
  出た診断を Final Report に引用する。
- **lockfile が 20 プラットフォームすべてのインストール可能なノードを保持して
  いること。** ローカル install の直後に、ルート `package-lock.json` が全
  `@typescript/typescript-*` について `resolved` と `integrity` を持つノードを
  含むことを確認する（裸の `optionalDependencies` 参照だけでは不可）。
  **注記（Codex レビュー、2026-08-12）**: この skew を起こす npm/cli#4828 は
  npm 11.3.0 で修正済みで、このホストは 11.12.1 — 確実に起きる事故ではない。
  それでも検査を残すのは、npm 11.2 以前を使う環境・将来の regression への
  安価な保険としてであり、検査が落ちたら npm のバージョンを最初に疑うこと。
  過去に同じ機構で Deploy Guide が毎回落ちた実績（rolldown、2026-06）が、
  この 1 行の検査の由来である。
- **公開 2 パッケージの扱いが意図的であること。** `plgg-bundle` と `plgg-test` は
  `typescript` を runtime `dependencies` に持つ。`^7` にすると npm 利用者に
  ネイティブバイナリ付きの依存が配布される。この 2 つを他の 27 と同じように
  上げたのか、別扱いにしたのかを Final Report で明言する。
- dependabot PR #112 が closed。
- 新規コードに `as` / `any` / `ts-ignore` が増えていない。
- `npm audit` が 0 vulnerabilities。

**Verification method**

- 上記をコマンドとして実行し、出力を Final Report に貼る。
- 計測は同一マシン・同一条件で 6.x と 7.x を採る。条件も記録する。

**Gate**

- check-all 緑、**CI 緑**、計測値がすべて埋まっていること、#112 が closed。

`Decided:` **CI の緑を受入に含める。** TS7 はプラットフォーム別バイナリを
optional dependency として解決するので、「この開発マシンで動く」ことと
「CI ランナーで動く」ことは別の主張である。過去に CI を壊したのはまさに
このクラスの依存だった（`/drive` で開発者が上書き可）。

`Decided:` **計測値は `DEPENDENCY-LOG.md` に書く。** ネイティブバインディングを
排除した経緯が書かれている当のファイルに、再導入の理由と数字を並べて置く。
別ファイルに書くと、次の読者が片側しか読まない（`/drive` で開発者が上書き可）。

`Decided:` **数字が悪くても、このチケットは採用を実行する。** 採否の判断は
ミッションのゴールとして「移行を完了させる」と決まっている（開発者判断
2026-08-12）。計測は判断を覆すためではなく、**払った代償を記録するため**に
行う。ただし計測で致命的な問題（CI で解決できないプラットフォームがある等）が
出た場合は別で、そのときは止めて報告する（`/drive` で開発者が上書き可）。

`Decided:` **decline も正規の終端状態として記録する。** 移行が成立しないと
確定した場合、PR #112 を黙って閉じるのではなく、`vendor-neutrality` が要求する
とおり **依存決定ログに「取った行動」として追記**する（update / workaround /
risk acceptance / exit strategy activation のどれか）。あわせて「6.x に留まる」を
期限付きの受容リスクとして記録する（`/drive` で開発者が上書き可）。

`Decided:` **依存決定ログに exit strategy を必ず書く。** `vendor-neutrality` は
exit strategy を log の必須項目としている。TS7 を採用するなら、**6.x に戻す
手順・影響範囲・概算工数**を書き残す。採用時にしか書けない情報である
（`/drive` で開発者が上書き可）。

`Decided:` **Node ランタイムは上げない。** CI は 22.x のまま。TS7 の採用と
Node のバージョン更新は独立した判断で、混ぜると切り分けが効かなくなる
（`/drive` で開発者が上書き可）。

## Considerations

- **`@types/node` 26 のチケット（`20260812134541`）とは独立。** 同じ日の
  dependabot PR だが、片方は型定義、片方はコンパイラ本体。どちらが先でも
  よいが、**同時に入れないこと** — 型エラーが出たときにどちらが原因か
  切り分けられなくなる。
- **optional dependency の性質。** 20 個のうち実際に install されるのは
  実行プラットフォームの 1 つだけ。したがって `node_modules` サイズへの影響は
  20 倍ではない。ただし lockfile には 20 個すべてが記録される（PR #112 の
  lockfile 差分が +376 行だったのはそのため）。
- **将来の CI プラットフォーム変更に効く。** 今は linux-x64 / arm64 で足りるが、
  ランナーやコンテナの基盤が変わったときにバイナリが無いと即死する。
  その脆さも記録に残す価値がある。
