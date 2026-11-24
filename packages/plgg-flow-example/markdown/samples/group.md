---
layout: sheet
description: Team を動かすと孫まで一緒に移動します。Shift＋クリックで複数選択し、グループ化・収納・親の変更を試せます。
---

# グループとネスト

```plgg-flow fill dsl tools=group
node Team at -80 0 group height 192 width 384
node Design at -160 0 48 group in Team height 96 width 160
node Build at 32 16 32 in Team
node Review at -152 16 96 in Design
node External at 304 16
Team -> Design
Team -> Build
Build -> External
Review -> External
```
