# plgg-foundry — 依頼から操作の順序を決める

アプリで実行できる操作を `makeFoundry` で登録して、`runFoundry(foundry)` に依頼文を渡します。`blueprint` が依頼から計画（Alignment）を作り、`operate` が計画に沿って操作を実行します。実行前の計画を見るには `beforeOperations`、実行後の結果を見るには `afterOperations` を指定します。
