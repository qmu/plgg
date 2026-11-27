# DSL syntax

Write one node, edge or directive per line. Blank lines are ignored. Outside double quotes, `#` starts a comment that runs to the end of the line. Quote names containing spaces or `#`. Inside a quoted name, use `\"` for a literal quote and `\\` for a backslash.

## Declare a node

`node ID` declares a node at the origin with its ID as the initial label. Each ID must be unique. Add any of these options on the same line.

| Option | Effect |
| --- | --- |
| `at x y [z]` | Set the center coordinates. Depth defaults to zero. |
| `label "display name"` | Set the visible label while keeping the ID used by edges. |
| `width w`, `height h` | Set the card dimensions. |
| `group`, `in parentID`, `collapsed` | Create a group, assign a node to a parent, or start folded. The parent ID must exist in the graph. |
| `grow x y` | Extend a group frame horizontally and vertically beyond the space its members occupy. |
| `value n` | Set a numeric input for the [sum example](../samples/compute.md). |
| `key=value` | Supply attributes for layouts and charts. Repeat for additional attributes. Quote the whole assignment if needed, for example `"team=Customer Support"`. |

```plgg-flow
node Source at -220 -50
node "Long name" at 0 15 label "Change the label"
node Result at 220 -50 width 150
Source -> "Long name"
"Long name" -> Result
```

## Connect nodes

Write `A -> B` with spaces around the arrow. This connects A to B and creates either endpoint if it has no declaration. Write each edge on its own line.

After the target you can add a quoted label, a route (`straight`, `step` or `curve`), and `animated` to show motion along the edge. Edges also accept attributes such as `amount=60`. A quoted token after the target is read as a label.

```plgg-flow
node Input at -220 0
node Route at 0 0
node Live at 220 -85
node Backup at 220 85
Input -> Route animated
Route -> Live "Normal" curve
Route -> Backup "Failover" step
```

## Constrain connections and movement

`rule acyclic` rejects new connections that would close a cycle. `rule max-outputs 2` allows up to two outgoing edges per node. You can apply both rules together. Set `snap 32` for a 32-unit drag grid. The default spacing is 16. Use `snap off` or `snap 0` for free movement.

```plgg-flow
rule acyclic
snap 32
node Source at -220 -50
node Process at 0 15
node Result at 220 -50
Source -> Process
Process -> Result
```

## Lay out a graph from its edges

`layout layered [right|down] [depth]` puts connected nodes in successive layers. The default direction is right. Use down for top-to-bottom flow and add depth to offset each layer along z. Nodes with an explicit `at` keep their positions outside the automatic layout. Try the [edge-only example](../samples/layered.md).

To put each category on a separate board, add a single axis such as `axis tier UI Logic Storage` to a layered layout. Assign nodes with `tier=Logic`. The explicit role is `view layer=tier`. A layer axis and the depth option are mutually exclusive. Explicit x and z positions on a board are constrained to its bounds.

## Assign rooms and views

`layout rooms` creates a room for each combination of attribute values. Declare each axis once with `axis attribute [values…]`. Listed values retain their order. Additional values come from the nodes. Leave roles unspecified to let the layout choose an assignment and camera.

```text
layout rooms
axis tier UI Logic
axis region Tokyo Osaka
view y=tier column=region camera=-0.4,-0.3
node Reception tier=UI region=Tokyo
node Payments tier=Logic region=Osaka
Reception -> Payments
```

In a `view` line, `x`, `y` and `z` place rooms within a block. `column` and `row` arrange whole blocks. Use `pin=region=Tokyo` to hold an attribute at a particular value, or `pin=region` for its first value. Assign roles to declared attributes. The shorthand `axis x region Tokyo Osaka` also assigns a spatial role (x, y or z). For an attribute literally named x, write `axis "x" low high`.

`view camera=yaw,pitch` sets the opening angles in radians for rooms, boards grouped by a layer axis, and charts. Use `mark A B` to draw attention to nodes or `mark "A -> B"` for a particular connection. Follow the marked path in the [data lineage example](../subjects/lineage.md).

## Place nodes by value

Cost runs horizontally and performance runs vertically. OptionB costs less than OptionC and performs better, so OptionC appears faded.

```plgg-flow
layout plot
axis Cost 0..200 lower
axis Performance 0..100 higher
node OptionA Cost=60 Performance=70
node OptionB Cost=140 Performance=90
node OptionC Cost=150 Performance=60
```

See [chart layouts](./charts.md) for the axes and attributes used to encode quantities, categories, order and time.
