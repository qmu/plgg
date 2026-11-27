---
layout: sheet
description: Lower cost and effort are preferable, as is higher throughput. Compare Legacy with Containers on all three axes to see why Legacy fades.
---

# Compare alternatives

```plgg-flow fill dsl
layout plot
axis MonthlyCost 0..200 lower
axis Throughput 0..100 higher
axis OpsEffort 0..10 lower
node SelfHosted MonthlyCost=60 Throughput=70 OpsEffort=9
node ManagedVM MonthlyCost=110 Throughput=75 OpsEffort=5
node Containers MonthlyCost=140 Throughput=90 OpsEffort=4
node Serverless MonthlyCost=90 Throughput=55 OpsEffort=1
node Dedicated MonthlyCost=190 Throughput=98 OpsEffort=7
node Legacy MonthlyCost=150 Throughput=60 OpsEffort=8
node SharedHosting MonthlyCost=20 Throughput=20 OpsEffort=3
```
