---
layout: sheet
description: Compare the teams at each stage. Work converges on QA, and the platform team appears throughout.
---

# Teams and release stages

```plgg-flow fill dsl tools=hidden
layout rooms
axis Stage Design Implementation Testing Release
axis Team UI Business Platform
view x=Stage y=Team
node UIDesign Stage=Design Team=UI
node APIDesign Stage=Design Team=Business
node SystemDesign Stage=Design Team=Platform
node UIImplementation Stage=Implementation Team=UI
node APIImplementation Stage=Implementation Team=Business
node Infrastructure Stage=Implementation Team=Platform
node IntegrationCheck Stage=Testing Team=Platform
node AcceptanceTest Stage=Testing Team=UI
node LoadTest Stage=Testing Team=Platform
node Release Stage=Release Team=Platform
UIDesign -> UIImplementation
APIDesign -> APIImplementation
SystemDesign -> Infrastructure
UIImplementation -> IntegrationCheck
APIImplementation -> IntegrationCheck
Infrastructure -> IntegrationCheck
IntegrationCheck -> AcceptanceTest
IntegrationCheck -> LoadTest
AcceptanceTest -> Release
LoadTest -> Release
```
