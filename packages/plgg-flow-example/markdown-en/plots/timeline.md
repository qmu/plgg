---
layout: sheet
description: A week range gives a task its duration. IntegrationTest spans weeks 8 to 11, while Release is a single event at week 12. The team axis separates lanes in depth.
---

# Place tasks on a timeline

```plgg-flow fill dsl
layout timeline
axis Week 0..12
axis Team Design Development Testing
node Requirements Week=0..2 Team=Design
node UIDesign Week=2..5 Team=Design
node APIImplementation Week=3..8 Team=Development
node UIImplementation Week=5..9 Team=Development
node IntegrationTest Week=8..11 Team=Testing
node Release Week=12 Team=Testing
Requirements -> UIDesign
Requirements -> APIImplementation
UIDesign -> UIImplementation
APIImplementation -> IntegrationTest
UIImplementation -> IntegrationTest
IntegrationTest -> Release
```
