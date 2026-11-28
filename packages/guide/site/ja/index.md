# plgg ガイド

plgg は TypeScript で入力を検証し、処理を小さな関数に分けてつなぐためのライブラリです。[最初のプログラム](/getting-started/)では、入力を一つ変えて、成功と失敗がどんな値で返るかを試します。

アプリケーションを書く方は[パッケージ一覧](/packages/)から始めてもかまいません。たとえば、[HTTP の応答を作る](/packages/plgg-http/)と[サーバーで返す](/packages/plgg-server/)を隣の列に並べて読めます。

## なぜ型から決めるのか

本の題名を登録する処理なら、最初に「登録できる題名」を型にします。フォームから届いた値を入口で検証してしまえば、保存や表示のたびに同じ条件を確かめずに済みます。値がない場合は `Option`、処理が失敗した場合は `Result` に理由を載せて、呼び出し側が次の動作を選びます。

データにはメソッドを持たせず、処理は独立した関数にします。設定を先に、対象の値を最後に受け取る形なら `pipe` でつなげます。型が合わないときは、入力を検証するか型ガードで範囲を絞ります。[本棚を作る](/tutorial/)ではこの流れを、HTTP から SQLite、HTML までたどれます。

## パッケージのつながり

矢印の左側が右側を使います。plgg-server → plgg-http ← plgg-fetch という関係なので、送る側と受け取る側は同じ応答型を使えます。plgg-db-migration → plgg-sql → plgg は保存側の流れです。文書の処理は plgg-ir-manifest → plgg-ir-language → plgg-ir-syntax → plgg-parser と分かれています。全体は[依存先の一覧](/packages/)を参照してください。

[設計の理由](/design/choices/)・[ほかの選択肢](/design/alternatives/)・[型と境界でつまずいたら](/design/friction/)・[パッケージの境界](/design/family/)
