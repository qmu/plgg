---
created_at: 2026-08-06T21:16:28+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on: [20260806211627-remove-the-poc-fleet-packages.md]
mission:
merge_policy: auto
---

# workspaces 移行が取り残した 39 個の lockfile と、それを前提にした dependabot 設定

## Overview

npm workspaces 移行（チケット `20260721180002`、コミット `cafb9107`、2026-08-01）は
「1 回のルート install」への切り替えを完了させたが、**`packages/*/package-lock.json`
39 本を追跡したまま残した**。移行チケットの受入にも実装手順にも Final Report にも
lockfile の撤去は一度も出てこない — 片付け対象として書かれていたのは
`node_modules` だけである。つまりこれは意図的な保持ではなく取りこぼしである。

にもかかわらず `docs/npm-workspaces-decision.md` は測定表に
`| Lockfiles | 39 | 1 |` という無条件の行を載せている。作業ツリーはこれを否定する。

残った 39 本は 2026-07-13（`Sync package lockfiles to plgg-bundle 0.0.6`）で
更新が止まっており、ルートの `package-lock.json` は 2026-08-01 に書き直されている。
**片方は生き、39 本は凍っている。**

### これが実際に起こしている害

1. **同一の脆弱性がアラート 2 件に重複する。** dependabot は凍った
   `packages/plgg-poc1-search/package-lock.json` とルートの lockfile の両方を
   依存グラフとして読むので、`sharp` の CVE が 2 回数えられる。
2. **`.github/dependabot.yml` が嘘の前提の上に立っている。** 設定は
   `directories: ["/packages/*"]` だけを対象にし、インラインコメントは
   *"No root package.json/workspaces: each packages/* dir is its own install root
   (own package.json + package-lock.json)"* と書いている。この前提は `cafb9107`
   で偽になった。結果、**version update は凍った 39 本に対して提案され、唯一
   生きているルートの lockfile には一度も向かわない**。
3. **コンテナが lockfile を書き換える。** 既存のフィードバック
   `20260713203507-container-npm-rewrites-a-sibling-package.md` が記録している
   とおり、`node:22-slim` の npm がバインドマウント越しに
   `packages/plgg-poc1-search/package-lock.json` を libc フィールドの差分で
   書き換え、これは 2 回 revert されて「また起きる」と書かれている。実際、この
   セッション中にガイドコンテナを起動して同じ churn が再発した。**追跡を外せば
   この concern も閉じる。**

`20260803220507`（生成物 `tsconfig.dts.json` の untrack）とまったく同じ形の問題
である — 生成物がソースツリーの一部として追跡され、ビルドのたびに worktree を
汚す。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 生成物は
  ソースツリーの一部として追跡しない。lockfile は install が生成するものであり、
  workspaces 構成では**ルートの 1 本だけ**が生成される。
- `workaholic:implementation` / `policies/objective-documentation.md` — ドキュメントは
  実際の挙動を書く。`docs/npm-workspaces-decision.md` の `Lockfiles 39 → 1` は
  現状を否定されている記述で、直すか脚注を付ける必要がある。
- `workaholic:implementation` / `policies/infrastructure-as-code.md` — CI/bot の
  設定はバージョン管理された事実であるべきで、実態と食い違ったまま放置しない。
- `workaholic:operation` / `policies/ci-cd.md` — 「緑になった」ではなく「何を
  検査したか」。dependabot が**何も見ていない**状態は緑と区別がつかないので、
  設定変更後に実際にスキャン対象が正しいことを示す必要がある。
- `workaholic:safety` — 脆弱性の検知経路が実質的に無効化されている状態は、
  検知の不在であって安全の証明ではない。
- `.workaholic/constraints/project.md` の Dependency Currency SLA — 「CVE を持つ
  パッケージの dependabot PR を 30 日以上 open にしない」。**その SLA は、
  dependabot が正しい lockfile を見ていて初めて意味を持つ。**

## Key Files

- `packages/*/package-lock.json` — 39 本。追跡を外す対象。
- `.gitignore` — 生成物セクションがあり、直近で `**/tsconfig.dts.json` を
  足したばかり。`packages/*/package-lock.json` の無視パターンをここに足す。
  **ルートの `package-lock.json` は追跡し続けること**（唯一の真実）。
  したがって `**/package-lock.json` のような書き方は禁物で、
  `packages/*/package-lock.json` と限定して書く。
- `.github/dependabot.yml` — `directories` をルート（`/`）に向け直し、
  偽になったコメントを書き換える。npm workspaces ではルートの 1 install root が
  全 workspace の依存を含むので、ルートだけで足りる。
- `docs/npm-workspaces-decision.md` — `| Lockfiles | 39 | 1 |` の行。移行時点で
  「install が生成する数」は確かに 1 になったが、追跡されている数は 39 のまま
  だった、という事実に合わせる。
- `scripts/npm-install.sh` — ルート 1 回 install であることの根拠。変更不要。
- `.workaholic/feedbacks/20260713203507-container-npm-rewrites-a-sibling-package.md`
  — このチケットで解消される既存 concern。Final Report で参照すること。

## Implementation Steps

1. `git rm --cached packages/*/package-lock.json` で 39 本の追跡を外す。
2. `.gitignore` の生成物セクションに `packages/*/package-lock.json` を追加し、
   なぜ 1 本だけ（ルート）が真実なのかを既存コメントの調子で 1〜2 行添える。
3. `.github/dependabot.yml` の `directories` を `["/"]` に変更し、偽になった
   コメントを現状に合わせて書き直す（workspaces のルートが唯一の install root）。
4. `docs/npm-workspaces-decision.md` の lockfile 行を事実に合わせる。
5. ルートで `./scripts/npm-install.sh` を実行し、ルートの lockfile 以外が
   生成・変更されないことを確認する。

## Quality Gate

**Acceptance criteria**

- `git ls-files | grep -c "packages/.*/package-lock.json"` が **0**。
- `git ls-files package-lock.json` が**ルートの 1 本を返す**（消しすぎていない
  ことの証明）。
- `git check-ignore -v packages/plgg/package-lock.json` が exit 0、かつ
  `git check-ignore -v package-lock.json` が**非ゼロ**（ルートは無視されない）。
- `./scripts/npm-install.sh` の**直後に** `git status --porcelain` が**空**。
- `.github/dependabot.yml` が `/` を対象にしており、`packages/*` を単独で
  指していないこと。`yq`/`python3` で読んで確認する。
- `./scripts/check-all.sh` が緑（exit 0）。

**Verification method**

- 上記をそのままコマンドとして実行し、出力を Final Report に貼る。
- **マージ後の確認項目**として、dependabot の次回スキャンがルートの lockfile を
  対象にしていること（Insights → Dependency graph、または新しい PR の対象パスが
  `/package-lock.json` になっていること）を報告に残す。マージ前には確定できない。

**Gate**

- check-all 緑、かつ上の 6 点。

`Decided:` **無視パターンは `packages/*/package-lock.json` と限定して書く。**
`**/package-lock.json` にするとルートの唯一の真実まで無視され、`npm ci` 相当の
再現性が失われる（`/drive` で開発者が上書き可）。

`Decided:` **dependabot の対象はルート 1 本にする。** npm workspaces ではルートの
install root が全 workspace の依存を解決するので、パッケージごとに向ける理由が
無くなった。これが `directories: ["/packages/*"]` が書かれた当時の前提そのもの
だった（`/drive` で開発者が上書き可）。

`Decided:` **`docs/npm-workspaces-decision.md` は書き換えるが、測定値は改竄
しない。** 当時の測定（install が生成する lockfile は 1 本）は正しく、誤りは
「追跡されている 39 本を消していない」ことが書かれていない点なので、脚注として
足す（`/drive` で開発者が上書き可）。

## Considerations

- **依存関係の順序。** このチケットは PoC 撤去チケット
  (`20260806211627`) に `depends_on` している。PoC を先に消せば 39 本のうち
  9 本が一緒に消えるので、こちらの対象は 30 本になる。逆順でも壊れないが、
  受入の数え方が変わるので順序を守るほうが読みやすい。
- **`npm ci` を使っている箇所は無い。** `scripts/` と `.github/` を grep した
  範囲では `npm ci` はコメント内の言及のみで、実際の呼び出しは
  `scripts/build.sh` の `npm install` と `scripts/npm-install.sh` のルート
  install だけ。したがって per-package lockfile を消しても再現性のある install
  は壊れない。**この前提はドライブ時に再確認すること**（新しい呼び出しが
  増えていれば話が変わる）。
- **実体ファイルは消してもよいが必須ではない。** 追跡さえ外れれば、次の
  install が触らない限り無害。ただしコンテナ越しの npm が書き換える churn を
  完全に止めたいなら、実体も消しておくほうが静かになる。
