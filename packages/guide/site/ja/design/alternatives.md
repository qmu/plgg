# 本棚にどこまで仕組みが要るか

## 登録フォームの検証が目的なら

Zod ではオブジェクトのスキーマを宣言し、safeParse の結果から検証済みデータか、項目のパスを含む問題の一覧を取り出します。Valibot もスキーマを値として組み立て、safeParse にスキーマと入力を渡すと output または issues が得られます。フォームの各欄にエラーを返して既存のアプリに渡すなら、そこで検証を完結できます。plgg の cast はキャスターを順に適用し、失敗した段で止まります。題名を検証した後も保存や表示まで同じ Result を運びたい場合に適しています。

[Zod](https://zod.dev/basics) · [Valibot](https://valibot.dev/guides/parse-data/)

## 保存処理をいつ開始するか

fp-ts の TaskEither は呼び出すまで実行しない非同期計算で、結果は Left または Right です。計算を値として組み立て、実行する時点を選ぶコードベースにはその形が合います。plgg の proc は呼び出すと Promise を返し、各段を順に進めます。すでに Promise と Result で書かれたハンドラーでは、実行を指示する層を増やさずに使えます。

[fp-ts TaskEither](https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html)

Effect は成功値と失敗に加え、実行に必要なサービスも Effect の型に持たせます。DB や時計を実行時に提供し、必要なものがそろった計算をランタイムに渡す設計なら、この三つ目の型に意味があります。plgg の本棚では接続を関数の引数で渡せます。小さな処理には見通しがよく、依存先が増えれば引数の受け渡しも増えます。

[Effect](https://effect.website/docs/getting-started/the-effect-type/)

## 一度失敗したら終了するなら

短い取り込みスクリプトで、読めないファイルでも壊れた JSON でも同じように終了するなら、通常の TypeScript と入口の try/catch で方針を一か所に書けます。一方、題名の誤りならフォームに戻し、保存できなければ再試行する画面では、例外の種類を呼び出し側で推測するより、Result に理由を残す利点があります。両方の流儀が混在する間は境界で変換が要ります。
