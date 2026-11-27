---
layout: sheet
description: Select Ship to see Stock and Payment among its inputs and Notify among its outputs. Choose a neighbor to follow the connection.
---

# Follow connections

```plgg-flow fill dsl tools=trace
node Order at -256 16
node Stock at -32 -80
node Payment at -40 80
node Ship at 192 16
node Notify at 376 16
Order -> Stock "Check stock"
Order -> Payment "Payments"
Stock -> Ship
Payment -> Ship
Ship -> Notify
```
