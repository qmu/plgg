---
layout: sheet
description: Compare Report with the other screens. Its connection goes directly to data and skips the business layer.
---

# Layers of a web service

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer UI Business Data
node Web Layer=UI
node Mobile Layer=UI
node Report Layer=UI
node Auth Layer=Business
node Orders Layer=Business
node Billing Layer=Business
node Users Layer=Data
node Sales Layer=Data
node Ledger Layer=Data
Web -> Auth
Mobile -> Auth
Web -> Orders
Mobile -> Orders
Auth -> Users
Orders -> Billing
Orders -> Sales
Billing -> Ledger
Report -> Sales
mark "Report -> Sales"
```
