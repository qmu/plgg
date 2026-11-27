# plgg-ir-language — 言語の構文に意味を与える

フォームや演算子、名前のスコープを定義し、`compileSource(language)(source)` に入力を渡します。処理は構文解析、展開、意味解析、正規化の順です。成功時には解析済みノードと正規化したテキストが得られます。実際の定義例には[ドメインモデル](/packages/plgg-ir-manifest/)と[論証](/packages/plgg-ir-thesis/)があります。
