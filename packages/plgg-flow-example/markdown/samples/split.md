---
layout: sheet
description: 挿入ボタンで先頭の接続を分割し、中間ノードを追加します。
---

# エッジに挿入

```plgg-flow fill dsl tools=split
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
