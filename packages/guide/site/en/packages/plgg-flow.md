# plgg-flow — Draw an interactive diagram

plgg-flow renders positioned nodes and the edges between them. `plgg-flow-example` pairs diagrams with their source. Open the [diagram guide](https://plgg-flow.qmu.co.jp/en/guide/dsl/) to try moving a node and see how its connections change.

## Working with the API

`parseSpec(source: string) → Result<Spec, string>`

`parseSpec` from plgg-flow/dsl reads a textual diagram. Names appearing only at edge endpoints become nodes too. `specFlow` builds the layout state. Pass the `flow` and rules to `printSpec` to produce text again. Keeping identity, connectivity and pinned positions distinct allows an edited diagram to round-trip.

```ts
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";

const diagram = parseSpec("Reader -> Shelf");
if (diagram.__tag === "Ok")
  console.log(
    printSpec(
      specFlow(diagram.content),
      diagram.content.rules,
    ),
  );
```

## Pin one node in a layered drawing

A process diagram can use automatic placement while keeping one review station at a chosen position. The source below connects three stages and fixes just the middle one. For later edits, keep the DSL with its layout rules and pins rather than a snapshot of calculated coordinates.

```ts
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";

const source = [
  "layout layered down depth",
  "Input -> Review",
  "Review -> Output",
  "node Review at 17 19",
].join("\n");
const spec = parseSpec(source);
if (spec.__tag === "Ok")
  console.log(
    specFlow(spec.content).nodes.map((n) => n.id),
  );
```
