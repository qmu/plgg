---
layout: sheet
description: Give each leaf its headcount. A parent spans the combined headcount below it, so you can compare departments on the same level.
---

# Break a whole into parts

```plgg-flow fill dsl
layout tree
axis Headcount
Company -> Development
Company -> SalesTeam
Company -> Management
Development -> Platform
Development -> UI
Development -> Quality
SalesTeam -> Domestic
SalesTeam -> Overseas
node Platform Headcount=6
node UI Headcount=14
node Quality Headcount=4
node Domestic Headcount=9
node Overseas Headcount=5
node Management Headcount=4
```
