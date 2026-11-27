---
layout: sheet
description: 幅を変えると Process の左右の端が移動します。接続線が新しいカードの幅にどう追従するか見てください。
---

# ノードのリサイズ

```plgg-flow fill dsl tools=resize
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
