---
layout: sheet
description: ノードをドラッグすると、格子ひとつ分ずつ吸着しながら動きます。snap 8 で半分の間隔に切り替え、snap off で自由に動かせます。
---

# グリッド吸着

```plgg-flow fill dsl tools=snap
snap 16
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
