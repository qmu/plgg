# DSL の構文

1 行に 1 つ、ノードか接続を書きます。`#` から行末まではコメントです。

## ノード

```text
node 名前 at x y [z] [group] [in 親] [label "表示名"] [value 数] [width 幅]
```

`at` は位置です。z を書くと奥行きが付きます（[配置と視点](./camera.md)）。空白を含む名前は `"` で囲みます。

```plgg-flow
node Source at -220 -50
node "Long name" at 0 15 label "表示名だけ変える"
node Result at 220 -50 width 150
Source -> "Long name"
"Long name" -> Result
```

## 接続

```text
A -> B ["ラベル"] [straight|step|curve] [animated]
```

```plgg-flow
node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route animated
Route -> Live "通常" curve
Route -> Backup "障害時" step
```

## 規則

図全体に効く指定です。それぞれの動きは、実例で試せます：[循環の防止](../samples/cycles.md)、[出力数の制限](../samples/limit.md)、[グリッド吸着](../samples/snap.md)。

| 構文 | 意味 |
| --- | --- |
| `rule acyclic` | 循環する接続を作らせない |
| `rule max-outputs 1` | 1 つのノードから出る接続の数を制限する |
| `snap 32` | ドラッグしたノードを 32 刻みの格子に吸着させる |

```plgg-flow
rule acyclic
snap 32
node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
```

Result から Source へ線を引こうとしても、循環になるので拒否されます。

## 位置が意味を持つ配置

`layout` に次のどれかを書くと、ノードの位置が値や順番や時間を表します。どれも `axis` の行を、その配置なりに読みます。

| 構文 | 何を表すか | `axis` の読み方 |
| --- | --- | --- |
| `layout plot` | 数値で比べる | 場所に 2〜3 本。`axis 費用 0..200 lower` のように範囲と、良い向き（`lower` / `higher`）を書ける。`<=150` `>=50` は条件、`size` は印の大きさに回す軸 |
| `layout bars` | 量を種類で比べる | 1 本目が量（棒の高さ）、2 本目が横に並べる種類、3 本目は奥行きに分ける種類 |
| `layout area` | 推移を系列ごとに奥へ並べる | 棒と同じ読み方。1 本目が量（高さ）、2 本目がたどる順（月など）、3 本目が系列。系列ごとに色のついた面になり、奥に連なる。`node 東 売上=22,30,41` のように値を並べると、node 1 行が 1 系列になる（このとき 3 本目は不要） |
| `layout sankey` | 量がどこへ流れるか | 1 本目が接続に書く量の属性（`A -> B 量=60`）、2 本目はノードを奥行きに分ける属性 |
| `layout sequence` | やりとりの順 | 0〜1 本。参加者を奥行きで分ける属性 |
| `layout timeline` | いつ何が走るか | 1 本目が時間（`axis 週 0..12`）、2 本目は面を分ける属性 |

```plgg-flow
layout plot
axis 費用 0..200 lower
axis 性能 0..100 higher
node 案A 費用=60 性能=70
node 案B 費用=140 性能=90
node 案C 費用=150 性能=60
```

案C は、費用でも性能でも案B に負けているので薄く描かれます。

`axis 費用 0..200 lower <=150` のように条件を書くと、条件を満たす範囲が点線で囲まれ、外れた案は薄くなります。外れた案は、他の案を負かす側にも数えません。ノードを `->` でつなげば折れ線になります。

実例：[案を比べる](../plots/options.md)、[条件の中で選ぶ](../plots/conditions.md)、[効果と手間で分ける](../plots/quadrant.md)、[量を種類で比べる](../plots/bars.md)、[推移を奥へ並べる](../plots/area.md)、[量がどこへ流れるか](../plots/sankey.md)、[やりとりの順](../plots/sequence.md)、[いつ何が走るか](../plots/timeline.md)。

## 次に読む

- [図の実例](./gallery.md) — 立体交差、グループ、計算ノード
- [配置と視点](./camera.md) — 奥行きと視点の回し方
- 接続の書き分けは実例で：[エッジの経路](../samples/routes.md)、[エッジのラベル](../samples/labels.md)、[フローのアニメーション](../samples/motion.md)
- 位置を書かずに並べる：[自動配置](../samples/layered.md)、[レイヤーに分ける](../samples/layers.md)、[部屋に分ける](../samples/rooms.md)
