---
layout: sheet
description: Read each spoke separately. Cost uses lower, so a less expensive option reaches farther out on the cost spoke.
---

# Compare profiles on a radar chart

```plgg-flow fill dsl
layout radar
axis Speed 0..10 higher
axis Cost 0..200 lower
axis Quality 0..10 higher
axis Maintenance 0..10 higher
axis SetupEffort 0..10 lower
node OffTheShelf Speed=8 Cost=160 Quality=6 Maintenance=8 SetupEffort=2
node Custom Speed=6 Cost=60 Quality=9 Maintenance=4 SetupEffort=8
node Hybrid Speed=7 Cost=100 Quality=8 Maintenance=7 SetupEffort=5
```
