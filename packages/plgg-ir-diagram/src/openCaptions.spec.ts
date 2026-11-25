import {
  readdirSync,
  readFileSync,
} from "node:fs";
import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
import { flowView } from "plgg-flow";
import { renderToString } from "plgg-view";
import { resizeDemo } from "plgg-ir-diagram/flowSheet";

const subjects = (dir: string): string[] =>
  readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = dir + "/" + entry.name;
    return entry.isDirectory()
      ? subjects(path)
      : [path];
  });
for (const file of subjects(
  "../plgg-flow/subjects",
)) {
  test(
    file +
      " opens with readable captions at 900 × 700",
    () => {
      const spec = parseSpec(
        readFileSync(file, "utf8").replace(
          /^\s*#.*$/gm,
          "",
        ),
      );
      if (spec.__tag === "Err")
        throw Error(spec.content);
      const flow = resizeDemo(
        specFlow(spec.content),
        700,
        true,
        0,
      );
      const cake =
        !!flow.layered?.options.layerAxis;
      const svg = renderToString(flowView(flow));
      const labels = Array.from(
        svg.matchAll(
          /<g [^>]*data-node-caption="(caption|tag)"[^>]*>/g,
        ),
      );
      for (const [group, kind] of labels) {
        if (kind === "tag") continue;
        const matrix = group
          .match(/matrix\(([^)]*)\)/)?.[1]
          ?.split(" ")
          .map(Number);
        if (!matrix) throw Error(group);
        const height =
          13 * Math.hypot(matrix[2]!, matrix[3]!);
        // 10px is the aim. Half a pixel is given up where
        // keeping it would bury the nodes of the far row.
        // A cake is looked at from above its boards, never
        // edge-on, whatever that costs its lettering: four
        // and five layers come to 8.2px in this frame.
        if (!(height >= (cake ? 8 : 9.5)))
          throw Error(
            height.toFixed(2) + "px " + group,
          );
      }
      return check(labels.length > 0, toBe(true));
    },
  );
}
