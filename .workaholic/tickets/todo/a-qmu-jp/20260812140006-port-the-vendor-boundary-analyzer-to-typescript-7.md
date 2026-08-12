---
created_at: 2026-08-12T14:00:06+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260812140001-map-the-typescript-7-api-gap.md]
mission: typescript-7-migration
merge_policy: auto
---

# vendor-boundary アナライザを TS7 に移植する（`preProcessFile` の代替が無い）

## Overview

`scripts/vendor-boundary-analyzer.mjs` は **5 番目のコンパイラ API 利用箇所**で、
計画時に見落とされかけた。`from "typescript"` の grep に引っかからないためである
— plgg-bundle の `package.json` を起点にした `createRequire` で読み込んでいる:

```js
const requireFromBundle = createRequire(join(PACKAGES, "plgg-bundle", "package.json"));
const ts = requireFromBundle("typescript");
// …
const info = ts.preProcessFile(text, true, true);
```

このファイルは 3 つの理由で、他の 4 箇所より危険である。

1. **`preProcessFile` は TS7 に存在せず、代替も見つかっていない。**
   `exportSurface.ts` の API には `unstable/sync` の `Checker` に対応物がある
   見込みだが、こちらは当てが無い。
2. **check-all の最初のゲート（`gate-vendor-boundary.sh`）を動かしている。**
   ここが落ちると、後続のゲートは 1 つも走らない。
3. **`.mjs` なので型チェックの対象外。** `scripts/tsconfig.json` の
   `include` は `["*.ts"]`。つまり **`tsc` が全部緑でも、このゲートは壊れている
   ことがある**。「型チェックが通ったから移行できた」という判断は、ここでは
   成立しない。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — リポジトリ
  ツーリングは `scripts/` に置く。新しい置き場所を作らない。
- `workaholic:implementation` / `policies/coding-standards.md` — `as` / `any` /
  `ts-ignore` は禁止。`.mjs` で型が無い箇所でも、実行時の検証で代替する。
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — このゲート
  自体が「第三者依存を `vendors/` に閉じ込める」ポリシーの執行機構である。
  **ゲートが壊れると境界の強制が消える**ので、静かに壊れることを許さない。
- `workaholic:operation` / `policies/ci-cd.md` — 「緑になった」ではなく「何を
  検査したか」。このチケットでは特に、**ゲートが実際に違反を検出できること**を
  実証する必要がある（型チェックでは検出できない対象なので、他に証拠が無い）。

## Key Files

- `scripts/vendor-boundary-analyzer.mjs` — 移植対象。`preProcessFile` の利用は
  113 行目。
- `scripts/gate-vendor-boundary.sh` — アナライザを呼ぶゲート。`check-all.sh` の
  最初期に走る。
- `scripts/vendor-boundary-exemptions.txt` — 例外リスト。**増やさないこと。**
- `docs/typescript-7-api-gap.md` — 先行スパイクの成果。`preProcessFile` の行を見る。
- `scripts/tsconfig.json` — `include: ["*.ts"]`。この `.mjs` が型チェック対象外で
  ある根拠。

## Implementation Steps

1. スパイクの対応表で `preProcessFile` の行を確認する。**「無し」なら 2 に進む。**
2. アナライザが `preProcessFile` から実際に必要としているものを特定する
   （import された specifier の列挙だけか、それ以外も見ているか）。必要な情報が
   限定的なら、TS7 の `unstable/ast` のパーサ/スキャナで同等の情報が取れるかを
   評価する。
3. 取れるなら移植する。取れないなら、**このゲートが TS7 でどう成立するかを
   ミッションの判断材料として報告し、そこで止める**。自前の import 抽出器を
   その場で発明しない（それは新しい脆い実装をゲートの中核に置くこと）。
4. ゲートが**違反を実際に検出できる**ことを実証する: `packages/*/src` の
   ドメイン配下（`vendors/` の外）に一時的に第三者 import を入れ、ゲートが
   非ゼロで落ちることを示す。戻して通ることも示す。

## Quality Gate

**Acceptance criteria**

- `./scripts/gate-vendor-boundary.sh` が緑。
- **違反検出の実証**: `vendors/` の外に第三者 import を一時的に置くとゲートが
  非ゼロで落ち、戻すと通る。入れた import と出たエラーメッセージの両方を
  Final Report に引用する。**これが唯一の「ゲートが生きている」証拠**である
  （型チェックはこのファイルを見ない）。
- `scripts/vendor-boundary-exemptions.txt` の行数が増えていない。
- `./scripts/check-all.sh` が緑（exit 0）。
- 移植後もアナライザが plgg-bundle 経由で typescript を解決していること、
  または解決経路を変えたならその理由が Final Report に書かれていること。

**Verification method**

- 上記をコマンドとして実行し、出力を Final Report に貼る。
- 違反検出の実証は、入れた差分と出力を両方引用する。

**Gate**

- 上記すべて。特に**違反検出の実証**は省略不可。

`Decided:` **自前の import 抽出器を発明しない。** `preProcessFile` の代替が
無い場合、正規表現や自作パーサで import を数える実装をゲートの中核に置くのは、
「脆い実装への依存を排除する」というこのゲート自身の目的に反する。代替が
無いことは、ミッションの判断材料として報告する（`/drive` で開発者が上書き可）。

`Decided:` **受入に違反検出の実証を必須で入れる。** このファイルは型チェックの
対象外なので、`tsc` が緑でも壊れていることがある。「常に緑を返すゲート」は
正常な状態と区別できず、しかもこのゲートは他のゲートより先に走るため、
壊れたまま気づかれない期間が最も長くなる（`/drive` で開発者が上書き可）。

## Considerations

- **grep で見つからなかったという事実自体が教訓。** `createRequire` 経由の
  依存は静的な import 検索に写らない。TS7 移行に限らず、依存の棚卸しをする
  ときに同じ穴がある。
- **`deriveExternal.spec.ts` の陳腐化した fixture。**
  `packages/plgg-bundle/src/domain/usecase/deriveExternal.spec.ts:69` が
  `"typescript/lib/typescript"` という文字列を使っている。文字列判定なので
  TS7 でもテストは通るが、7.x にそのパスは存在しない。ついでに更新する価値がある。
- **このチケットは T1（スパイク）にのみ依存する。** plgg-bundle や plgg-test の
  移植とは独立に進められるので、並行して着手してよい。
