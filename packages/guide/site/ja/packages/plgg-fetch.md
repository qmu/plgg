# plgg-fetch — HTTP の応答を読み取る

`await get(url)` は [plgg-http](/packages/plgg-http/) の応答を `Result` で返します。通信できなければ `Err` です。404 でも応答を受信できれば `Ok` なので、アプリ側でステータスを確認します。

JSON 本文を使うには `decodeJsonBody` に検証関数を渡します。本文が JSON として読めない場合も、項目が合わない場合も、失敗の理由を呼び出し元で扱えます。
