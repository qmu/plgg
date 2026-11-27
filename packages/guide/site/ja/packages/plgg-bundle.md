# plgg-bundle — ライブラリをビルドする

パッケージの `bundle.config.ts` でエントリーポイント、出力形式、外部依存を指定します。そのディレクトリで `npx plgg-bundle` を実行すると、設定に沿って JavaScript を出力します。ライブラリは ES モジュールや CommonJS、型宣言を出力でき、ブラウザー向けのアプリには app ターゲットを使います。
