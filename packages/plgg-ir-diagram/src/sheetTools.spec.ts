// @plgg-test-environment dom
import { test, check, toBe } from "plgg-test";
import { makeRenderer } from "plgg-view/client";
import {
  createFlow,
  type Change,
} from "plgg-flow";
import {
  readSheetSource,
  sheetTools,
} from "plgg-ir-diagram/flowSheet";

test("sheet tool buttons edit the current flow", () => {
  let flow = readSheetSource(
    "A -> B\nB -> C",
    createFlow({ nodes: [], edges: [] }),
    [],
  ).flow;
  const root = document.createElement("div");
  const render = makeRenderer<Change>(
    root,
    (change) => {
      flow = change(flow);
    },
  );
  const click = (name: string, label: string) => {
    const tool = sheetTools.get(name);
    if (!tool) return false;
    render(tool.view(flow));
    const button = Array.from(
      root.querySelectorAll("button"),
    ).find((b) => b.textContent === label);
    button?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    render(tool.view(flow));
    return !!button;
  };
  const routes = [
    "straight",
    "step",
    "curve",
  ].every(
    (route) =>
      click("routes", route) &&
      flow.edges.every(
        (e) => e.route === route,
      ) &&
      root.querySelector('[aria-pressed="true"]')
        ?.textContent === route,
  );
  const snap = [0, 8, 16, 32].every(
    (step) =>
      click(
        "snap",
        step ? `snap ${step}` : "snap off",
      ) && flow.snap === step,
  );
  const views =
    click("views", "立体") &&
    flow.camera.yaw === -0.48 &&
    flow.camera.pitch === 0.42 &&
    click("views", "正面") &&
    Number(flow.camera.yaw) === 0 &&
    Number(flow.camera.pitch) === 0;
  const split =
    click("split", "接続の途中に挿入") &&
    flow.nodes.length === 4 &&
    flow.edges.some(
      (e) =>
        e.source === "A" && e.target === "Step 1",
    ) &&
    flow.edges.some(
      (e) =>
        e.source === "Step 1" && e.target === "B",
    ) &&
    flow.edges.some(
      (e) => e.source === "B" && e.target === "C",
    );
  render.dispose();
  return check(
    routes && snap && views && split,
    toBe(true),
  );
});
