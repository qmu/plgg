---
layout: sheet
description: Trace web traffic and name resolution down the stack. Both paths reach IP before they branch toward the network links.
---

# The four TCP/IP layers

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer Application Transport Internet Link
node HTTP Layer=Application
node TLS Layer=Application
node DNS Layer=Application
node TCP Layer=Transport
node UDP Layer=Transport
node IP Layer=Internet
node ICMP Layer=Internet
node Ethernet Layer=Link
node Wi-Fi Layer=Link
HTTP -> TLS
TLS -> TCP
DNS -> UDP
DNS -> TCP
TCP -> IP
UDP -> IP
ICMP -> IP
IP -> Ethernet
IP -> Wi-Fi
```
