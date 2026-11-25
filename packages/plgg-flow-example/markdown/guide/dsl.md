# DSL の書き方

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

| 書き方 | 意味 |
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

## 次に読む

- [図の実例](./gallery.md) — 立体交差、グループ、計算ノード
- [配置と視点](./camera.md) — 奥行きと視点の回し方
- 接続の書き分けは実例で：[エッジの経路](../samples/routes.md)、[エッジのラベル](../samples/labels.md)、[フローのアニメーション](../samples/motion.md)
- 位置を書かずに並べる：[自動配置](../samples/layered.md)、[レイヤーに分ける](../samples/layers.md)、[部屋に分ける](../samples/rooms.md)
