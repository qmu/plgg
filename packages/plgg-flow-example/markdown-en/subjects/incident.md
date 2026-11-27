---
layout: sheet
description: Follow the edges leaving RootCause. Both support and operations depend on the platform team’s investigation.
---

# Incident response

```plgg-flow fill dsl tools=hidden
layout rooms
axis Phase Detection Investigation Recovery Reporting
axis Team Support Business Platform
view x=Phase y=Team
node SupportRequest Phase=Detection Team=Support
node Alert Phase=Detection Team=Platform
node AssessImpact Phase=Investigation Team=Business
node RootCause Phase=Investigation Team=Platform
node NotifyClient Phase=Recovery Team=Support
node FixConfig Phase=Recovery Team=Platform
node Rerun Phase=Recovery Team=Business
node Report Phase=Reporting Team=Support
SupportRequest -> AssessImpact
Alert -> RootCause
AssessImpact -> RootCause
RootCause -> FixConfig
RootCause -> NotifyClient
RootCause -> Rerun
FixConfig -> Rerun
NotifyClient -> Report
Rerun -> Report
```
