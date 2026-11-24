// @plgg-test-environment dom
import { makeRenderer } from "plgg-view/client";
import {
  selectSubject,
  subjectSelected,
  type Subject,
} from "plgg-flow/dsl";
import { test, check, toBe } from "plgg-test";
import {
  dslRows,
  replaceRow,
} from "plgg-ir-diagram/dslRows";
import {
  createFlow,
  type Change,
} from "plgg-flow";
import { readSheetSource } from "plgg-ir-diagram/flowSheet";

test("invalid replacement retains the last good flow, rules and measured frame", () => {
  const initial = {
    ...createFlow({ nodes: [], edges: [] }),
    frame: { x: 900, y: 711 },
    cover: 270,
  };
  const good = readSheetSource(
    "node A at 0 0\nrule acyclic",
    initial,
    [],
  );
  const bad = readSheetSource(
    replaceRow(
      ["node A at 0 0", "rule acyclic"],
      0,
      "node A at nope 0",
    ),
    good.flow,
    good.rules,
  );
  const fixed = readSheetSource(
    "node A at 16 0\nrule acyclic",
    bad.flow,
    bad.rules,
  );
  return check(
    bad.flow === good.flow &&
      bad.rules === good.rules &&
      bad.error.startsWith("1 行目") &&
      fixed.flow.frame === initial.frame &&
      fixed.flow.cover === 270 &&
      fixed.flow.nodes[0]?.position.x === 16,
    toBe(true),
  );
});

test("editing the second parallel wire preserves its selection through reparse", () => {
  const first = readSheetSource(
    "A -> B\nA -> B",
    createFlow({ nodes: [], edges: [] }),
    [],
  );
  const subject = {
    kind: "edge",
    index: 1,
  } satisfies Subject;
  const flow = selectSubject(
    subject,
    false,
  )(first.flow);
  const edited = readSheetSource(
    "A -> B\nA -> B curve",
    flow,
    [],
  );
  return check(
    subjectSelected(subject, edited.flow) &&
      !subjectSelected(
        { kind: "edge", index: 0 },
        edited.flow,
      ),
    toBe(true),
  );
});

test("plain row text selects its row and reveals prefixed ghosts and the delete button", () => {
  const source = "rule acyclic\nA -> B";
  const sheet = readSheetSource(
    source,
    createFlow({ nodes: [], edges: [] }),
    [],
  );
  const root = document.createElement("div");
  let flow = sheet.flow;
  const render = makeRenderer<Change>(
    root,
    (change) => {
      flow = change(flow);
    },
  );
  const draw = () =>
    render(
      dslRows(
        flow,
        sheet.rules,
        source,
        undefined,
        (change) => change,
        () => (f) => f,
      ),
    );
  draw();
  const row = (i: number) =>
    root.querySelectorAll(".dsl-row")[i];
  const hidden =
    !root.querySelector(".ghost") &&
    !root.querySelector(".dsl-delete");
  const keyword = row(0)?.firstChild;
  keyword?.dispatchEvent(
    new MouseEvent("click", { bubbles: true }),
  );
  draw();
  const directive =
    row(0)?.getAttribute("aria-selected") ===
      "true" &&
    !!row(0)?.querySelector(".dsl-delete");
  row(3)?.dispatchEvent(
    new MouseEvent("click", { bubbles: true }),
  );
  draw();
  const ghosts = Array.from(
    row(3)?.querySelectorAll(".ghost") ?? [],
  ).map((e) => e.textContent);
  const selected =
    row(3)?.getAttribute("aria-selected") ===
      "true" &&
    row(3)?.textContent?.includes(
      "  +step +animated",
    ) &&
    !!row(3)?.querySelector(".dsl-delete") &&
    !row(0)?.querySelector(".dsl-delete");
  render.dispose();
  return check(
    keyword?.textContent === "rule" &&
      hidden &&
      directive &&
      selected &&
      ghosts.join(" ") === "+step +animated",
    toBe(true),
  );
});
