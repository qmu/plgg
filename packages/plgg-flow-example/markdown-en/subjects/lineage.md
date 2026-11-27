---
layout: sheet
description: Start with confidential member data and follow the transformations that feed the public aggregate.
---

# Trace data lineage

```plgg-flow fill dsl tools=hidden
layout rooms
axis Stage Raw Transform Serving
axis Classification Confidential Internal Public
view x=Stage y=Classification
node Members Stage=Raw Classification=Confidential
node Payments Stage=Raw Classification=Confidential
node Events Stage=Raw Classification=Internal
node Product Stage=Raw Classification=Public
node TransformMembers Stage=Transform Classification=Confidential
node TransformSales Stage=Transform Classification=Internal
node TransformEvents Stage=Transform Classification=Internal
node Metrics Stage=Serving Classification=Internal
node PublicAggregate Stage=Serving Classification=Public
node ProductList Stage=Serving Classification=Public
Members -> TransformMembers
Payments -> TransformSales
Events -> TransformEvents
Product -> ProductList
TransformMembers -> Metrics
TransformSales -> Metrics
TransformEvents -> PublicAggregate
TransformMembers -> PublicAggregate
mark "TransformMembers -> PublicAggregate"
```
