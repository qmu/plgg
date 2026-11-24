// @plgg-test-environment dom
import { check, test, toBe } from "plgg-test";
import { renderToString } from "plgg-view";
import { flowWidget } from "plgg-ir-diagram/flow";
import {
  measuredFrame,
  resizeDemo,
} from "plgg-ir-diagram/flowSheet";
import { createFlow } from "plgg-flow";

// plgg-test supplies a DOM without a layout engine. Supply the client
// rectangles a browser reports, including the measured toolbar and inspector.
for (const [
  width,
  height,
  boardWidth,
  boardHeight,
  panelWidth,
  panelHeight,
  stripWidth,
  stripHeight,
] of [
  [390, 844, 390, 796, 390, 44, 390, 44],
  [844, 390, 844, 350, 422, 350, 48, 350],
  [768, 1024, 768, 972, 28, 972, 346, 34],
  [1024, 768, 1024, 716, 280, 716, 346, 34],
  [1280, 800, 980, 752, 320, 752, 346, 34],
  [1680, 1050, 1380, 1002, 320, 1002, 346, 34],
] satisfies [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
][]) {
  test(`the sheet fits the measured cover at ${width} × ${height}`, () => {
    const stage = document.createElement("div");
    const element = (
      parent: Element,
      name: string,
      w: number,
      h: number,
    ) => {
      const child = document.createElement("div");
      child.setAttribute("class", name);
      parent.appendChild(child);
      child.getBoundingClientRect = () =>
        new DOMRect(0, 0, w, h);
      return child;
    };
    const host = element(
      stage,
      "canvas-wrap",
      boardWidth,
      boardHeight,
    );
    element(
      host,
      "toolbar",
      stripWidth,
      stripHeight,
    );
    element(
      stage,
      "dsl",
      panelWidth,
      panelHeight,
    );
    const frame = measuredFrame(host);
    if (!frame) return check(false, toBe(true));
    const flow = resizeDemo(
      createFlow({
        nodes: [
          {
            id: "A",
            label: "A",
            position: { x: 0, y: 0, z: 0 },
          },
        ],
        edges: [],
      }),
      frame.height,
      true,
      frame.cover,
      frame.insets,
    );
    const units = (n: number) =>
      Math.round((900 * n) / boardWidth);
    return check(
      flow.camera.origin.x ===
        (900 - frame.cover + frame.insets.left) /
          2 &&
        flow.camera.origin.y ===
          (frame.height -
            frame.insets.bottom +
            frame.insets.top) /
            2 &&
        flow.cover ===
          units(width === 390 ? 0 : panelWidth) &&
        flow.frame?.y === units(boardHeight) &&
        flow.sheetInsets?.bottom ===
          units(
            width === 390 ? panelHeight : 0,
          ) &&
        flow.sheetInsets?.left ===
          units(width === 844 ? stripWidth : 0) &&
        flow.sheetInsets?.top ===
          units(width === 390 ? stripHeight : 0),
      toBe(true),
    );
  });
}
test("the static sheet has its responsive stage, drawing and DSL", () => {
  const html = renderToString(
    flowWidget("A -> B", "plgg-flow fill dsl"),
  );
  return check(
    [
      "flow-sheet",
      "stage",
      "canvas-wrap",
      "dsl",
      "flow-board",
    ].every((name) =>
      html.includes('class="' + name + '"'),
    ),
    toBe(true),
  );
});
