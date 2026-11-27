---
layout: sheet
description: Start playback and follow the motion from Source to Result. Stop playback to inspect the same path at rest.
---

# Animate the flow

```plgg-flow fill dsl tools=motion
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
