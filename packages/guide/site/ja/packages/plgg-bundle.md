# plgg-bundle — ライブラリをビルドする

パッケージの `bundle.config.ts` でエントリーポイントと出力形式を指定します。そのディレクトリで `npx plgg-bundle` を実行すると、設定に沿って JavaScript を出力します。ライブラリは ES モジュールや CommonJS、型宣言を出力でき、ブラウザー向けのアプリには app ターゲットを使います。

外部依存の一覧は `package.json` から導出されます。

## 使い方と制約

`build(config: BundleConfig) → ReadonlyArray<string>`

build は同期的にファイルを生成し、書き込んだ相対パスを返します。ライブラリでは宣言ファイルも後続パッケージが読みます。一時ディレクトリで出力を作って最後に入れ替えるため、ビルドの途中に空の dist が見える時間を抑えられます。

## ライブラリの設定を読む

たとえばこのリポジトリの packages/plgg-http/bundle.config.ts を開くと、どのソースからどのファイル名を作るかを確認できます。entries の input は rootDir からの相対パスです。依存先の公開サブパスを import した場合も、そのライブラリを取り込まず、利用時に解決する参照として残します。未宣言の依存関係でビルドが止まったときは、設定に例外を書き足す前に `package.json` を確認してください。
