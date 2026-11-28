# plgg-ir-diagram — Check diagram references and types

`compileDiagram` reads nodes, ports, and edges from text. It checks referenced names and port types before returning diagram data. See [embedding diagrams in plggpress](https://plggpress.qmu.co.jp/en/sheets/) for Markdown usage, or [plgg-flow](https://plgg-flow.qmu.co.jp/en/) for interactive examples.

## Working with the API

`compileDiagram(source: string)`

Changing one port name yields a diagnostic at the reference. Mismatched port types and duplicate node ids are checked too. Compile before rendering and pass the successful graph to the view.

```ts
import { compileDiagram } from "plgg-ir-diagram";

console.log(
  compileDiagram("diagram shelf { node book }")
    .__tag,
);
console.log(
  compileDiagram(
    "diagram shelf { node book node book }",
  ).__tag,
);
```

## Extract the text at a diagnostic range

A range can identify a misspelled port itself. The declared input here is receive, while the edge refers to recv. Apply diagnostic offsets to the original source. Whitespace in the canonical ir can differ.

```ts
import { compileDiagram } from "plgg-ir-diagram";

const source =
  "diagram shop { a.send -> b.recv node a { out send: Order } node b { in receive: Order } }";
const r = compileDiagram(source);
if (r.__tag === "Err")
  console.log(
    r.content.map((d) =>
      source.slice(
        d.range.start.offset,
        d.range.end.offset,
      ),
    ),
  );
```
