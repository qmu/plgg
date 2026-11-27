# 値を受け取ってから返すまで

フォームから届いた値は、まず [cast](/concepts/validation/) で検証します。失敗した理由も呼び出し元で使いたいときは [Result](/concepts/result/)、任意項目が空でもかまわないときは [Option](/concepts/option/) で表します。どちらも[タグ付きの値](/concepts/tagged-data/)です。

検証済みの値は [pipe](/concepts/composition/) で次の関数に渡せます。途中で通信が必要なら [proc](/concepts/async/)、戻り値の種類ごとに表示を切り替えるなら [match](/concepts/match/) を使います。
