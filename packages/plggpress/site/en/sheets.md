# Embed a diagram

Use a `plgg-flow` code block to put a diagram next to the instructions it illustrates. This one shows how a draft reaches publication. The initial drawing is rendered into the HTML, so it’s visible even with JavaScript disabled.

```plgg-flow
node Draft at -180 0
node Review at 0 0
node Publish at 180 0
Draft -> Review
Review -> Publish
```

Copy this block into your own Markdown file to reproduce the diagram. The [plgg-flow DSL guide](https://plgg-flow.qmu.co.jp/guide/dsl/) shows how to position nodes, add labels, and choose line styles.

~~~~markdown
```plgg-flow
node Draft at -180 0
node Review at 0 0
node Publish at 180 0
Draft -> Review
Review -> Publish
```
~~~~

## Give the diagram its own column

Put this frontmatter at the start of the file to use the sheet layout. Give the reader a hint in `description` and change the fence’s opening line to `plgg-flow fill dsl tools=routes,snap`. The figure fills its space, with controls for editing the source, routing lines, and snapping to the grid. To publish a change you tried in the browser, edit the Markdown source and rebuild.

```yaml
---
layout: sheet
description: Move a node to see how its connections change.
---
```

On a sheet, content after the first `fill` part is omitted. Place instructions and related links above the figure.

The other built-in fence, `plgg-diagram`, draws diagrams with ports on nodes. See [Registering a part](/parts/) to add a fence of your own.
