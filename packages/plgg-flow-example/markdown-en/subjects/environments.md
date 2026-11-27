---
layout: sheet
description: Compare corresponding rooms in production and staging. Billing and Ledger appear only in production.
---

# Compare service environments

```plgg-flow fill dsl tools=hidden
layout rooms
axis Layer UI Business Data
axis Environment Production Staging
view y=Layer z=Environment
node Web Layer=UI Environment=Production
node Auth Layer=Business Environment=Production
node Orders Layer=Business Environment=Production
node Billing Layer=Business Environment=Production
node Users Layer=Data Environment=Production
node Ledger Layer=Data Environment=Production
node Web' Layer=UI Environment=Staging
node Auth' Layer=Business Environment=Staging
node Orders' Layer=Business Environment=Staging
node Users' Layer=Data Environment=Staging
Web -> Auth
Web -> Orders
Auth -> Users
Orders -> Billing
Billing -> Ledger
Web' -> Auth'
Web' -> Orders'
Auth' -> Users'
mark Billing Ledger
```
