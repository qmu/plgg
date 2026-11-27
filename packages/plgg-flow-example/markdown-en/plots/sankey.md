---
layout: sheet
description: Give each edge an amount. The two bands leaving Revenue split in the ratio 62 to 38 between gross profit and costs.
---

# Follow a quantity through a network

```plgg-flow fill dsl
layout sankey
axis Amount
axis Destination Internal External
node Revenue Destination=Internal
node GrossProfit Destination=Internal
node Costs Destination=External
node Payroll Destination=Internal
node Overhead Destination=External
node OperatingProfit Destination=Internal
node Tax Destination=External
node NetProfit Destination=Internal
Revenue -> GrossProfit Amount=62
Revenue -> Costs Amount=38
GrossProfit -> Payroll Amount=28
GrossProfit -> Overhead Amount=14
GrossProfit -> OperatingProfit Amount=20
OperatingProfit -> Tax Amount=6
OperatingProfit -> NetProfit Amount=14
```
