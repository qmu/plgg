---
layout: sheet
description: The dotted boundary shows which combinations meet the limits, including a cost ceiling of 150 and a performance floor of 50. Marker size shows staffing.
---

# Set limits and size markers

```plgg-flow fill dsl
layout plot
axis MonthlyCost 0..200 lower <=150
axis Throughput 0..100 higher >=50
axis OpsEffort 0..10 lower <=6
axis Staff 1..6 lower size
node SelfHosted MonthlyCost=60 Throughput=70 OpsEffort=9 Staff=5
node ManagedVM MonthlyCost=110 Throughput=75 OpsEffort=5 Staff=3
node Containers MonthlyCost=140 Throughput=90 OpsEffort=4 Staff=4
node Serverless MonthlyCost=90 Throughput=55 OpsEffort=1 Staff=1
node Dedicated MonthlyCost=190 Throughput=98 OpsEffort=7 Staff=6
node Legacy MonthlyCost=150 Throughput=60 OpsEffort=6 Staff=4
node SharedHosting MonthlyCost=20 Throughput=20 OpsEffort=3 Staff=1
```
