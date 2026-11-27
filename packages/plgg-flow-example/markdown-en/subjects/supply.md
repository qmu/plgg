---
layout: sheet
description: Trace components from their origins to sales. Every route passes through the assembly plant in Taiwan.
---

# A supply network

```plgg-flow fill dsl tools=hidden
layout rooms
axis Stage Material Component Assembly Retail
axis Region Japan Taiwan Europe
view x=Stage z=Region
node MaterialA Stage=Material Region=Japan
node MaterialB Stage=Material Region=Europe
node Board Stage=Component Region=Japan
node Battery Stage=Component Region=Taiwan
node Case Stage=Component Region=Europe
node AssemblyPlant Stage=Assembly Region=Taiwan
node JapanRetail Stage=Retail Region=Japan
node TaiwanRetail Stage=Retail Region=Taiwan
node EuropeRetail Stage=Retail Region=Europe
MaterialA -> Board
MaterialA -> Battery
MaterialB -> Case
Board -> AssemblyPlant
Battery -> AssemblyPlant
Case -> AssemblyPlant
AssemblyPlant -> JapanRetail
AssemblyPlant -> TaiwanRetail
AssemblyPlant -> EuropeRetail
mark AssemblyPlant
```
