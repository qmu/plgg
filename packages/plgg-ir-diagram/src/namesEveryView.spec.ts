import {
  readdirSync,
  readFileSync,
} from "node:fs";
import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
import { flowView, viewAt } from "plgg-flow";
import { renderToString } from "plgg-view";
import {
  fitDemo,
  resizeDemo,
} from "plgg-ir-diagram/flowSheet";

// From whatever side a space is looked at, every node
// it shows carries its name: on a face, or on a tag
// when the face is turned away, under a board or
// behind another node.
const subjects = (dir: string): string[] =>
  readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = dir + "/" + entry.name;
    return entry.isDirectory()
      ? subjects(path)
      : [path];
  });
const cameras = [
  [-0.22, -0.2],
  [-0.22, -1.05],
  [-1.3, -0.2],
  [-Math.PI / 6, -0.55],
  [0.6, -0.4],
  [2.6, -0.4],
  [-0.5, -1.3],
  [-2.0, -0.3],
  [0.9, -0.1],
] satisfies [number, number][];
for (const file of subjects(
  "../plgg-flow/subjects",
)) {
  test(
    file + " names every node from nine sides",
    () => {
      const spec = parseSpec(
        readFileSync(file, "utf8").replace(
          /^\s*#.*$/gm,
          "",
        ),
      );
      if (spec.__tag === "Err")
        throw Error(spec.content);
      const opened = resizeDemo(
        specFlow(spec.content),
        700,
        true,
        0,
      );
      for (const [yaw, pitch] of cameras) {
        const flow = fitDemo(
          viewAt(yaw, pitch)(opened),
        );
        const svg = renderToString(
          flowView(flow),
        ).replace(/&#39;|&apos;/g, "'");
        const named = new Set(
          Array.from(
            svg.matchAll(
              /data-node-caption="(?:caption|tag)"[^>]*data-node="([^"]*)"/g,
            ),
          ).map((m) => m[1]),
        );
        const lost = flow.nodes
          .filter(
            (n) =>
              (!flow.focus ||
                flow.focus.has(n.id)) &&
              !named.has(n.id),
          )
          .map((n) => n.id);
        if (lost.length)
          throw Error(
            yaw + "," + pitch + ": " + lost,
          );
      }
      return check(true, toBe(true));
    },
  );
}
