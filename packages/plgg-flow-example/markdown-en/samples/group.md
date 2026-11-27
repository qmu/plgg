---
layout: sheet
description: Move Team and watch Review travel with it, nested inside Design. External sits outside the group.
---

# Nest groups

```plgg-flow fill dsl tools=group
node Team at -80 0 group height 192 width 384
node Design at -160 0 48 group in Team height 96 width 160
node Build at 32 16 32 in Team
node Review at -152 16 96 in Design
node External at 304 16
Team -> Design
Team -> Build
Build -> External
Review -> External
```
