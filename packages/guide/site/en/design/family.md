# Reading the package boundaries

Checking a bookshelf title requires neither an HTTP request nor a database connection. Absence, failure, tagged values and composition live in plgg. A value specific to a protocol, such as an HTTP status, belongs in that protocol’s package. Both plgg-server and plgg-fetch use the response from plgg-http, so a client can read it without importing the server.

An arrow points from a consumer to a dependency. This diagram selects the links involved in rendering pages and diagrams.

```plgg-flow
node plggpress at -260 -90
node plggmatic at -40 -90
node plgg-view at 190 -90
node plgg-ir-diagram at -260 40
node plgg-flow at -40 40
node plgg-board at 190 90
plggpress -> plggmatic
plggpress -> plgg-ir-diagram
plggmatic -> plgg-view
plgg-ir-diagram -> plgg-flow
plgg-flow -> plgg-board
plgg-flow -> plgg-view
```

## Where to change a button, diagram or page

Change a shared button in plggmatic. CLAUDE.md assigns shared parts to one implementation, and commit `1e765915` moved the plggpress site frame to the kit. Turning manuscripts and links into pages remains a plggpress concern. For diagrams, plgg-board projects coordinates, plgg-flow renders nodes and interactions, and plgg-ir-diagram validates ports and references. A change to edge rendering can leave the manuscript language intact.

## Before adding a feature to core

`.workaholic/constraints/architecture.md` records the reason for keeping vendor and AI concerns out of the foundational types and allowing layers to be versioned independently. plgg-kit handles model providers and plgg-foundry plans and runs registered operations. Core depends on neither.

A placement heuristic inferred from today’s dependencies is to ask whether explaining the operation requires a port, column name or storage target. Start in the package that owns that concept. Moving code into core solely because two apps share it would expose unrelated consumers to the domain. A small shared package such as the HTTP model is another option. See the [directory and direct dependencies](/packages/).
