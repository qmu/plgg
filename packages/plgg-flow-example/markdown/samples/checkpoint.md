---
layout: sheet
description: 図と視点を保存し、ノードを動かしてから復元してください。このスナップショットはページを開いている間だけ使えます。
---

# スナップショット

```plgg-flow fill dsl tools=snapshots
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
