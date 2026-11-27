---
layout: sheet
description: Read across the design department’s row. Tanaka appears in all three projects.
---

# People and projects

```plgg-flow fill dsl tools=hidden
layout rooms
axis Project Renewal New Maintenance
axis Department Design Development Operations
view x=Project y=Department
node Tanaka Project=Renewal Department=Design
node Tanaka' Project=New Department=Design
node Tanaka'' Project=Maintenance Department=Design
node Sato Project=Renewal Department=Development
node Suzuki Project=Renewal Department=Development
node Takahashi Project=New Department=Development
node Ito Project=Maintenance Department=Development
node Watanabe Project=Renewal Department=Operations
node Yamamoto Project=Maintenance Department=Operations
Tanaka -> Sato
Tanaka -> Suzuki
Tanaka' -> Takahashi
Tanaka'' -> Ito
Sato -> Watanabe
Ito -> Yamamoto
Tanaka -> Tanaka'
Tanaka' -> Tanaka''
mark Tanaka Tanaka' Tanaka''
```
