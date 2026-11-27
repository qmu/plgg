---
layout: sheet
description: Follow external traffic through the DMZ and compare its route into the internal network with the management path.
---

# Network zones

```plgg-flow fill dsl tools=hidden
layout layered down
axis Zone Internet DMZ Internal Management
node User Zone=Internet
node ExternalService Zone=Internet
node OuterFirewall Zone=DMZ
node PublicWeb Zone=DMZ
node MailRelay Zone=DMZ
node InnerFirewall Zone=Internal
node AppServer Zone=Internal
node InternalDB Zone=Internal
node Bastion Zone=Management
node Monitor Zone=Management
User -> OuterFirewall
ExternalService -> OuterFirewall
OuterFirewall -> PublicWeb
OuterFirewall -> MailRelay
PublicWeb -> InnerFirewall
MailRelay -> InnerFirewall
InnerFirewall -> AppServer
AppServer -> InternalDB
Bastion -> AppServer
Bastion -> InternalDB
Monitor -> PublicWeb
Monitor -> AppServer
```
