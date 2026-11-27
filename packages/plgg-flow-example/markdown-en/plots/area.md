---
layout: sheet
description: Months run horizontally and height represents sales. Rotate the chart to see the months where one region’s area obscures another.
---

# Follow a series in depth

```plgg-flow fill dsl
layout area
axis Sales 0..100 higher
axis Month Jan Feb Mar Apr May Jun Jul Aug
node East Sales=22,30,41,48,63,74,86,93
node West Sales=64,70,66,58,52,47,40,36
node South Sales=12,26,48,70,58,34,44,60
```
