# plgg-kit — モデルに構造化出力を依頼する

`generateObject` にプロバイダー、`userPrompt`、出力の `schema` を渡します。OpenAI、Anthropic、Google の呼び分けはプロバイダーの値で決まります。成功値の型は `unknown` なので、アプリで使う前に [cast](/concepts/validation/) で検証します。テストでは `post` を差し替えて応答を用意できます。
