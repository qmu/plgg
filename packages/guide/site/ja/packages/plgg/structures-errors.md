# 構造とエラーを調べる

同じ型の要素が並ぶ配列には `asVecOf`、項目名が決まっているレコードには `asObj` と `forProp` を使います。[書籍の検証例](/concepts/validation/)のように、項目ごとに異なる検証関数を指定できます。

失敗した `Result` から `InvalidError` を取り出すと、`content.message` に説明があり、`content.sibling` には一緒に報告されたエラーが並びます。`printPlggError` で関連するエラーも含めてコンソールに表示できます。
