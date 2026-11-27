---
layout: sheet
description: 再生して Source から Result へ流れる向きを確認し、停止して同じ経路を見比べてください。
---

# フローのアニメーション

```plgg-flow fill dsl tools=motion
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
