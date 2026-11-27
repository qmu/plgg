// @plgg-test-environment dom
import {
  session,
  apply,
  type Action,
} from "plgg-ir-diagram/sheetSession";
import {
  parseSpec,
  specFlow,
  printSpec,
} from "plgg-flow/dsl";
import { test, check, toBe } from "plgg-test";
import { el, renderToString } from "plgg-view";
import { makeRenderer } from "plgg-view/client";
import {
  createFlow,
  viewAt,
  type Change,
} from "plgg-flow";
import {
  nextSheetView,
  readSheetSource,
  sheetToolbar,
  sheetTools,
  resetSheet,
  addSheetNode,
  record,
  history,
  travel,
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
    if (!tool || !("view" in tool)) return false;
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

test("reset preserves the graph and heights and is one reversible history step", () => {
  const opened = readSheetSource(
    "node A at 0 0 37\nA -> B",
    createFlow({ nodes: [], edges: [] }),
    [],
  ).flow;
  const rotated = viewAt(0.5, 0.25)(opened);
  const edited = addSheetNode(rotated);
  const reset = resetSheet(edited);
  const newest = record(
    record(history(opened), rotated),
    edited,
  );
  const first = travel(newest, reset, "first");
  const last = travel(
    first.history,
    first.current,
    "last",
  );
  const back = travel(
    last.history,
    last.current,
    "back",
  );
  const next = travel(
    back.history,
    back.current,
    "next",
  );
  const branch = record(
    back.history,
    back.current,
  );
  return check(
    reset.nodes.length === edited.nodes.length &&
      reset.edges.length ===
        edited.edges.length &&
      reset.nodes.every(
        (n) =>
          n.position.z ===
          edited.nodes.find(
            (old) => n.id === old.id,
          )?.position.z,
      ) &&
      reset.camera.yaw === 0 &&
      reset.camera.pitch === 0 &&
      first.current === opened &&
      !first.history.before.length &&
      last.current === reset &&
      !last.history.after.length &&
      back.current === edited &&
      next.current === reset &&
      !branch.after.length,
    toBe(true),
  );
});

test("the toolbar exposes disabled history endpoints and four drawn navigation controls", () => {
  const buttons = (
    back: boolean,
    forward: boolean,
  ) =>
    renderToString(
      sheetToolbar(
        () => 0,
        back,
        forward,
        () => 0,
        false,
      ),
    );
  const initial = buttons(false, true),
    latest = buttons(true, false);
  const disabled = (
    html: string,
    label: string,
  ) =>
    html
      .match(
        new RegExp(
          '<button[^>]*aria-label="' +
            label +
            '"[^>]*>',
        ),
      )?.[0]
      ?.includes("disabled") ?? false;
  return check(
    ["最初に", "戻る"].every(
      (label) =>
        disabled(initial, label) &&
        !disabled(latest, label),
    ) &&
      ["次に", "最後に"].every(
        (label) =>
          !disabled(initial, label) &&
          disabled(latest, label),
      ) &&
      initial.match(/<svg/g)?.length === 5 &&
      initial.indexOf("中央に戻す") <
        initial.indexOf("最初に"),
    toBe(true),
  );
});

test("three suggested views cycle without changing the written sheet", () => {
  const parsed = parseSpec(
    "layout rooms\naxis 層 A B\naxis 場所 X Y\nnode a 層=A 場所=X\nnode b 層=B 場所=Y\na -> b",
  );
  if (parsed.__tag === "Err")
    throw Error(parsed.content);
  const initial = specFlow(parsed.content);
  const source = printSpec(initial, []);
  let f = initial;
  const seen = new Set<string>();
  for (let i = 0; i < 3; i++) {
    f = nextSheetView(f);
    if (
      printSpec(f, []) !== source ||
      !f.roomMotion
    )
      return check(false, toBe(true));
    seen.add(
      JSON.stringify([
        f.rooms?.axes,
        f.camera.yaw,
        f.camera.pitch,
      ]),
    );
  }
  return check(
    seen.size === 3 &&
      f.camera.yaw === initial.camera.yaw &&
      f.camera.pitch === initial.camera.pitch,
    toBe(true),
  );
});

test("the snapshots tool shares the edit history of its own sheet", () => {
  const parsed = parseSpec("A -> B");
  if (parsed.__tag === "Err")
    throw Error(parsed.content);
  const opening = specFlow(parsed.content);
  let state = session(opening);
  const other = session(opening);
  const root = document.createElement("div");
  const render = makeRenderer<Action>(
    root,
    (action) => {
      state = action(state);
    },
  );
  const click = (name: string, label: string) => {
    const tool = sheetTools.get(name);
    if (!tool || !("sessionView" in tool))
      throw Error(name);
    render(
      el("div", [], tool.sessionView(state)),
    );
    const button = Array.from(
      root.querySelectorAll("button"),
    ).find(
      (button) => button.textContent === label,
    );
    if (!button) throw Error(label);
    button.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  };
  click("snapshots", "現在の状態を保存");
  state = apply(addSheetNode)(state);
  const edited = state.flow;
  click("snapshots", "保存状態を復元");
  const restored = state.flow === opening;
  click("history", "元に戻す");
  render.dispose();
  return check(
    restored &&
      state.flow === edited &&
      other.saved.__tag === "None",
    toBe(true),
  );
});
