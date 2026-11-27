# plgg-token-metering — トークン数と費用を見積もる

`countTokens(input)(counter)` の結果を読むときは、語彙を使った BPE の計数値か、校正データによる推定値かを確認します。BPE 用の語彙は呼び出し側で用意します。推定値には精度情報があるので、`tokenBounds` で幅を求め、`projectCost` で費用の見込みを出せます。
