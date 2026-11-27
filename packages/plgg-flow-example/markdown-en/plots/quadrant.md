---
layout: sheet
description: Find tasks with effort at most 5 and impact at least 5. Edit either threshold to see which tasks still qualify.
---

# Compare impact and effort

```plgg-flow fill dsl
layout plot
axis Effort 0..10 lower <=5
axis Impact 0..10 higher >=5
node FasterSearch Effort=3 Impact=8
node AutomatedInvoices Effort=4 Impact=9
node AdminRedesign Effort=9 Impact=7
node NotificationCopy Effort=1 Impact=3
node RetireOldAPI Effort=8 Impact=2
node ReviewPermissions Effort=6 Impact=8
node FormatLogs Effort=2 Impact=6
```
