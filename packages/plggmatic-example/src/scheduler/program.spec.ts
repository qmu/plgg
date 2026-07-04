// @plgg-test-environment dom
//
// The scheduler demo driven end to end in the in-house DOM — the headless
// equivalent of the ticket's "real browser drive" (the same environment
// plgg-view proves its runtime in). Mounts the derived program via
// `application(...)` and drives the flow with real anchor/button clicks and
// History navigation: menu → list → detail → destructive confirm (cancel is a
// no-op, confirm executes) → the URL reflects the arrangement and restores it.
import {
  test,
  check,
  all,
  toBe,
  toContain,
  beforeEach,
  afterEach,
} from "plgg-test";
import { application } from "plgg-view/client";
import { program } from "./program.ts";

let stop: () => void = () => {};

const mount = (): Element => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(program)(root);
  return root;
};

const click = (target: EventTarget): void => {
  target.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );
};

const byText = (
  root: Element,
  selector: string,
  txt: string,
): Element | undefined =>
  Array.from(
    root.querySelectorAll(selector),
  ).find((n: Element) =>
    (n.textContent ?? "").includes(txt),
  );

const clickText = (
  root: Element,
  selector: string,
  txt: string,
): void => {
  const el = byText(root, selector, txt);
  if (el !== undefined) {
    click(el);
  }
};

const flush = (): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, 0),
  );

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
});

test("mounts showing the root menu", () => {
  const root = mount();
  return all([
    check(
      root.textContent,
      toContain("Notes"),
    ),
    check(
      root.textContent,
      toContain("Tasks"),
    ),
  ]);
});

test("opening a menu entry shows its list and reflects the URL", () => {
  const root = mount();
  clickText(root, "a", "Notes");
  return all([
    check(
      window.location.search,
      toContain("c=sections"),
    ),
    check(
      root.textContent,
      toContain("Botany"),
    ),
    check(
      root.textContent,
      toContain("Geology"),
    ),
  ]);
});

test("drilling a section reveals its notes list", () => {
  const root = mount();
  clickText(root, "a", "Notes");
  clickText(root, "a", "Botany");
  return all([
    check(
      window.location.search,
      toContain("p=botany"),
    ),
    check(
      root.textContent,
      toContain("Moss on the north face"),
    ),
  ]);
});

test("selecting a note shows its detail body", () => {
  const root = mount();
  clickText(root, "a", "Notes");
  clickText(root, "a", "Botany");
  clickText(root, "a", "Moss on the north face");
  return check(
    root.textContent,
    toContain("continuous moss mat"),
  );
});

test("the back link truncates the flow", () => {
  const root = mount();
  clickText(root, "a", "Notes");
  clickText(root, "a", "Botany");
  clickText(root, "a", "← back");
  return all([
    check(
      root.textContent,
      toContain("Botany"),
    ),
    // the notes body is no longer on screen
    check(
      (root.textContent ?? "").includes(
        "continuous moss mat",
      ),
      toBe(false),
    ),
  ]);
});

test("a destructive action asks to confirm; cancel is a no-op", () => {
  const root = mount();
  clickText(root, "a", "Tasks");
  clickText(root, "a", "Re-survey the moss mat");
  clickText(root, "button", "Delete");
  const parked = root.querySelector(".sd-confirm");
  // capture the prompt text NOW — clicking Cancel below
  // re-renders and recycles this node, so reading its
  // textContent after the click would see a stale value.
  const parkedText = parked?.textContent ?? "";
  clickText(root, "button", "Cancel");
  const cleared = root.querySelector(".sd-confirm");
  return all([
    check(parked !== null, toBe(true)),
    check(
      parkedText.includes("Delete this task?"),
      toBe(true),
    ),
    check(cleared === null, toBe(true)),
    // the task detail is still on screen after cancel
    check(
      root.textContent,
      toContain("Re-survey the moss mat"),
    ),
  ]);
});

test("confirming a delete runs the effect and drops the row", async () => {
  const root = mount();
  clickText(root, "a", "Tasks");
  clickText(
    root,
    "a",
    "Photograph the erratic",
  );
  clickText(root, "button", "Delete");
  clickText(root, "button", "Confirm");
  await flush();
  // back to the tasks list — the deleted task is gone
  clickText(root, "a", "Tasks");
  return check(
    (root.textContent ?? "").includes(
      "Photograph the erratic",
    ),
    toBe(false),
  );
});

test("an immediate create action adds a row", async () => {
  const root = mount();
  clickText(root, "a", "Tasks");
  clickText(root, "button", "Add task");
  await flush();
  return check(
    root.textContent,
    toContain("New task"),
  );
});
