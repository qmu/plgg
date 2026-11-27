---
layout: sheet
description: Quarters run across the chart and regions run into depth. Compare the bar heights to find the first quarter when East outsells West.
---

# Compare quantities with bars

```plgg-flow fill dsl
layout bars
axis Sales 0..100 higher
axis Quarter Q1 Q2 Q3 Q4
axis Region East West South
node East1 Quarter=Q1 Region=East Sales=40
node East2 Quarter=Q2 Region=East Sales=55
node East3 Quarter=Q3 Region=East Sales=70
node East4 Quarter=Q4 Region=East Sales=92
node West1 Quarter=Q1 Region=West Sales=62
node West2 Quarter=Q2 Region=West Sales=58
node West3 Quarter=Q3 Region=West Sales=45
node West4 Quarter=Q4 Region=West Sales=38
node South1 Quarter=Q1 Region=South Sales=18
node South2 Quarter=Q2 Region=South Sales=30
node South3 Quarter=Q3 Region=South Sales=52
node South4 Quarter=Q4 Region=South Sales=66
```
