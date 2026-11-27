---
layout: sheet
description: Read the messages from top to bottom in edge order. Follow the authorization request from OrderAPI to Payments and the reply in the opposite direction.
---

# Read a message sequence

```plgg-flow fill dsl
layout sequence
axis Side Client Server
node User Side=Client
node Screen Side=Client
node OrderAPI Side=Server
node Payments Side=Server
node OrderDB Side=Server
User -> Screen "Place order"
Screen -> OrderAPI "POST /orders"
OrderAPI -> Payments "Authorize"
Payments -> OrderAPI "Approved"
OrderAPI -> OrderDB "Save"
OrderAPI -> Screen "201 Created"
Screen -> User "Show confirmation"
```
