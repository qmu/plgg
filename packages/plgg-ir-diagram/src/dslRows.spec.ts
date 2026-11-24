import {
  selectSubject,
  subjectSelected,
  type Subject,
} from "plgg-flow/dsl";
import { test, check, toBe } from "plgg-test";
import { replaceRow } from "plgg-ir-diagram/dslRows";
import { createFlow } from "plgg-flow";
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
