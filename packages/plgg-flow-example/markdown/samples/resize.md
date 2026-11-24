---
layout: sheet
description: 幅スライダーで Process のカードを伸縮します。左右のポートと接続端も追従します。
---

# ノードのリサイズ

```plgg-flow fill dsl tools=resize
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
