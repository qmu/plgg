---
layout: sheet
description: Find the edge from store to view. It crosses upward from a lower layer to a higher one.
---

# Module dependencies

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer UI Business Platform
node pages Layer=UI
node view Layer=UI
node forms Layer=UI
node orders Layer=Business
node billing Layer=Business
node rules Layer=Business
node store Layer=Platform
node http Layer=Platform
node log Layer=Platform
pages -> view
pages -> forms
view -> orders
forms -> orders
forms -> billing
orders -> rules
billing -> rules
orders -> store
billing -> http
rules -> log
store -> view
mark "store -> view"
```
