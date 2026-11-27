---
layout: sheet
description: Band thickness gives each region’s contribution. The top edge shows monthly totals. Without an explicit range, the scale extends to the largest total.
---

# Read totals and contributions

```plgg-flow fill dsl
layout stack
axis Sales higher
axis Month Jan Feb Mar Apr May Jun Jul Aug
node East Sales=22,30,41,48,63,74,86,93
node West Sales=64,70,66,58,52,47,40,36
node South Sales=12,26,48,70,58,34,44,60
```
