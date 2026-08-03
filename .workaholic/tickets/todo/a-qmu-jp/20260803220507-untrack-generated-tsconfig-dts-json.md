---
created_at: 2026-08-03T22:05:07+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on:
mission:
merge_policy: auto
---

# 生成物 tsconfig.dts.json が追跡されていて、ビルドのたびに worktree が汚れる

## Overview

`packages/plgg-ir-manifest/tsconfig.dts.json` が git に**追跡されている**が、この
ファイルは plgg-bundle の宣言ファイル生成が**毎回書いて毎回消す一時生成物**であ
る。したがって当該パッケージをビルドするたびに、追跡ファイルが削除された状態
（`D packages/plgg-ir-manifest/tsconfig.dts.json`）になり、worktree が汚れる。

`emitDts`（`packages/plgg-bundle/src/domain/usecase/emitDts.ts`）の実装がその
ライフサイクルを明示している:

1. パッケージルートに `tsconfig.dts.json` を `writeFileSync` で合成して書く
2. その config で `tsc --project` を走らせる
3. `rmSync(dtsConfig, { force: true })` で**必ず消す**

つまり「コミットされた `tsconfig.dts.json`」を読むコードはリポジトリ内に一つも
無い。`emitDts.ts` 以外にこの名前を参照する箇所は存在しない（確認済み）。37 の
ライブラリ target パッケージのうち、この 1 つだけが追跡コピーを持っている。

### 実害（この run で実際に踏んだ）

汚れた worktree はゲートに引っかかる。`/drive` の claim 撤去
（`cleanup-mission-worktree.sh`）はこれを検知して撤去を**拒否**し、
`{"error": "worktree has uncommitted changes; not removed"}` を返した。
`/ship` と `/report` の Workspace Guard も同じ状態を「未コミットの作業が残って
いる」と報告する。いずれも実際には**誰の作業でもない**。

再現:

```
$ ( cd packages/plgg-ir-manifest && npm run build )
$ git status --short
 D packages/plgg-ir-manifest/tsconfig.dts.json
```

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 生成物は
  ソースツリーの一部として追跡しない。ビルド出力とソースの境界を保つ。
- `workaholic:implementation` / `policies/coding-standards.md` — リポジトリ規約
  （`.gitignore` の一時生成物セクション）に従う。
- `workaholic:operation` / `policies/ci-cd.md` — ビルドが副作用として worktree
  を汚すと、そのクリーンさを前提にしたゲート（claim 撤去、Workspace Guard）が
  偽陽性を出す。

## Key Files

- `packages/plgg-ir-manifest/tsconfig.dts.json` — 追跡されている生成物。これを
  untrack する。
- `.gitignore` — 31〜35 行目に plgg-bundle の一時生成物セクション（
  `**/dist/`, `**/dist.stage/`, `**/dist.old/`）が既にある。同じ由来・同じ性質
  なので、ここに並べるのが自然な置き場所。
- `packages/plgg-bundle/src/domain/usecase/emitDts.ts` — 書いて消すライフサイク
  ルの当事者。**変更しない**（挙動は正しい）。読んで前提を確認するだけ。

## Related History

このファイルが混入した経緯は git log から特定できなかった（`--diff-filter=A`
が空を返す。おそらく他の変更に紛れて追加された）。同じ「plgg-bundle の一時生成
物」という分類で `dist.stage/` / `dist.old/` が既に `.gitignore` に登録済みで、
その追加時に `tsconfig.dts.json` だけ漏れたと見るのが自然。

## Implementation Steps

1. `git rm --cached packages/plgg-ir-manifest/tsconfig.dts.json` で追跡だけ外す
   （作業ツリー上のファイルは次のビルドで再生成・削除されるので、実体の扱いは
   問わない）。
2. `.gitignore` の plgg-bundle 一時生成物セクション（`**/dist.stage/` /
   `**/dist.old/` の並び）に `**/tsconfig.dts.json` を追加し、なぜ一時生成物な
   のか（emitDts が書いて消す）を既存コメントの調子で 1〜2 行添える。
3. 他のパッケージに同種の取りこぼしが無いか確認する:
   `git ls-files | grep -E 'tsconfig\.dts\.json|dist\.stage|dist\.old'` が空で
   あること。

## Quality Gate

**Acceptance criteria**

- `git ls-files | grep tsconfig.dts.json` が**何も返さない**（追跡コピーがゼロ）。
- `( cd packages/plgg-ir-manifest && npm run build )` の**直後に**
  `git status --porcelain` が**空**である（ビルドが worktree を汚さない）。
- 同じビルドで `packages/plgg-ir-manifest/dist/` に `.d.ts` が従来どおり出力さ
  れる（宣言生成そのものは壊していない）。
- `.gitignore` の新しい行が `**/tsconfig.dts.json` を無視し、かつ他の
  `tsconfig*.json`（`tsconfig.json` / `tsconfig.build.json`）を**無視しない**:
  `git check-ignore -v packages/plgg-ir-manifest/tsconfig.json` が非ゼロで終わる
  こと。

**Verification method**

- 上記4点をそのままコマンドとして実行する。
- `./scripts/check-all.sh` が緑（exit 0）。宣言生成は全ライブラリパッケージの
  ビルド経路なので、check-all が dts 出力の回帰を捕まえる。

**Gate**

- check-all 緑、かつ上の受入4点すべてが成立していること。

`Decided:` 検証は check-all と上記の直接コマンドのみとし、公開 tarball の
スモーク（`publish.ts --dry-run`）までは要求しない — このチケットは追跡状態と
`.gitignore` だけを変え、`files` 許可リストにも dist の中身にも触れないため、
tarball の内容は定義上変わらない（`/drive` で開発者が上書き可）。

`Decided:` `emitDts.ts` 自体は変更しない — 書いて消す挙動は正しく、問題は
「その生成物が追跡されていること」だけなので、修正範囲は追跡状態に限定する
（`/drive` で開発者が上書き可）。

## Considerations

- **無視パターンの範囲に注意。** `tsconfig.dts.json` は `tsconfig` で始まるが、
  `tsconfig.json` と `tsconfig.build.json` は**追跡され続けなければならない**
  （`emitDts` の `tsconfigFor` がそれらを読んで extends する）。`tsconfig*` の
  ようなワイルドカードは使わないこと（`.gitignore`）。
- **将来の再発。** 37 のライブラリ target パッケージすべてが同じ一時ファイルを
  生成するので、無視パターンは 1 パッケージ限定ではなく `**/` で全体に効かせる
  （`.gitignore`）。
- 実体ファイルを消すかどうかは重要でない。`emitDts` が毎ビルド書き直すので、
  `--cached` で追跡を外せば十分（`packages/plgg-bundle/src/domain/usecase/emitDts.ts`）。
