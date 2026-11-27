---
layout: sheet
description: Trace the path from the Osaka client to the Osaka API and locate the detour through Tokyo.
---

# Network paths

```plgg-flow fill dsl tools=hidden
layout rooms
axis Layer L7 L3 L2
axis Location Tokyo Osaka
view y=Layer x=Location
node TokyoLB Layer=L7 Location=Tokyo
node TokyoAPI Layer=L7 Location=Tokyo
node OsakaAPI Layer=L7 Location=Osaka
node TokyoRouter Layer=L3 Location=Tokyo
node OsakaRouter Layer=L3 Location=Osaka
node TokyoSwitch Layer=L2 Location=Tokyo
node OsakaSwitch Layer=L2 Location=Osaka
node OsakaClient Layer=L2 Location=Osaka
OsakaClient -> OsakaSwitch
OsakaSwitch -> OsakaRouter
OsakaRouter -> TokyoRouter
TokyoRouter -> TokyoLB
TokyoLB -> TokyoAPI
TokyoLB -> OsakaAPI
TokyoSwitch -> TokyoRouter
mark "OsakaRouter -> TokyoRouter" "TokyoLB -> OsakaAPI"
```
