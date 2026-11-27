# plgg-ir-thesis — 主張と関係を検証する

主張や主張間の関係を記述し、`compileThesis` に渡します。成功すると `nodes`、正規化した `canonical`、攻撃関係から求めた `surviving` が得られます。関係の循環など、フレームの規則に反する場合は原文の範囲を示す診断が返ります。[反例を読む実例](/packages/plgg-ir-thesis-proof/)で結果を比べられます。
