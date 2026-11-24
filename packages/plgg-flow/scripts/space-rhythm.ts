import { readFileSync } from "node:fs";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";

// Compare the published spatial sheets, or pass a DSL or Markdown file.
const inputs = process.argv.slice(2);
const files = inputs.length
  ? inputs
  : ["layers", "rooms", "dimensions"].map(
      (name) =>
        new URL(
          `../../plgg-flow-example/markdown/samples/${name}.md`,
          import.meta.url,
        ),
    );
console.table(
  files.map((file) => {
    const source = readFileSync(file, "utf8");
    const spec = parseSpec(
      /^```plgg-flow[^\n]*\n([\s\S]*?)^```/m.exec(
        source,
      )?.[1] ?? source,
    );
    if (spec.__tag === "Err")
      throw Error(
        String(file) + " " + spec.content,
      );
    const flow = specFlow(spec.content);
    const floor = new Map(
      flow.rooms?.rooms.flatMap((r) =>
        r.members.map(
          (id) =>
            [id, r.max.y] satisfies [
              string,
              number,
            ],
        ),
      ),
    );
    const drops = flow.edges.filter(
      (e) =>
        floor.has(e.source) &&
        floor.has(e.target) &&
        floor.get(e.source) !==
          floor.get(e.target),
    );
    const straight = drops.filter((e) => {
      const first = e.path?.[0];
      return (
        first &&
        e.path?.every(
          (p) =>
            p.x === first.x && p.z === first.z,
        )
      );
    }).length;
    return {
      sheet: String(file).split("/").pop(),
      drops: drops.length,
      vertical: straight,
      verticalShare: drops.length
        ? straight / drops.length
        : null,
      distinctX: new Set(
        flow.nodes.map((n) => n.position.x),
      ).size,
      distinctZ: new Set(
        flow.nodes.map((n) => n.position.z),
      ).size,
    };
  }),
);
