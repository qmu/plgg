// @plgg-test-environment dom
//
// The scheduler demo driven end to end in the in-house DOM — the headless
// equivalent of the ticket's "real browser drive" for tickets 09/10/11:
// menu → list → detail → destructive confirm, PLUS the runtime mode toggle
// (multi-column ⇄ single-column) proven loss-free (same position, same URL).
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

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
});

test("mounts in multi-column mode with a mode toggle", () => {
  const root = mount();
  return all([
    check(
      root.textContent,
      toContain("Notes"),
    ),
    check(
      root.querySelector(".pm-scheduler") !== null,
      toBe(true),
    ),
    check(
      root.querySelector(".sd-modebtn") !== null,
      toBe(true),
    ),
  ]);
});

test("the toggle flips to single-column and back, loss-free", () => {
  const root = mount();
  clickText(root, "a", "Notes");
  clickText(root, "a", "Botany");
  const urlBefore =
    window.location.pathname +
    window.location.search;
  clickText(root, "button", "single-column");
  const single =
    root.querySelector(".pm-single") !== null &&
    root.querySelector(".pm-scheduler") === null;
  const urlAfter =
    window.location.pathname +
    window.location.search;
  clickText(root, "button", "multi-column");
  const backToMulti =
    root.querySelector(".pm-scheduler") !== null;
  return all([
    check(single, toBe(true)),
    // the mode flip did not touch the URL
    check(urlAfter, toBe(urlBefore)),
    check(backToMulti, toBe(true)),
  ]);
});

test("drilling a section reveals its notes and reflects the URL", () => {
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

test("a destructive action confirms; cancel is a no-op", () => {
  const root = mount();
  clickText(root, "a", "Tasks");
  clickText(root, "a", "Re-survey the moss mat");
  clickText(root, "button", "Delete");
  const parked = root.querySelector(".pm-dialog");
  const parkedText = parked?.textContent ?? "";
  clickText(root, "button", "Cancel");
  const cleared = root.querySelector(".pm-dialog");
  return all([
    check(parked !== null, toBe(true)),
    check(
      parkedText.includes("Delete this task?"),
      toBe(true),
    ),
    check(cleared === null, toBe(true)),
  ]);
});

test("single-column shows one screen with a back control after drilling", () => {
  const root = mount();
  clickText(root, "a", "Notes");
  clickText(root, "a", "Botany");
  clickText(root, "button", "single-column");
  return all([
    // one operation per screen: the notes list is shown
    check(
      root.textContent,
      toContain("Moss on the north face"),
    ),
    check(
      root.querySelector('[aria-label="Back"]') !==
        null,
      toBe(true),
    ),
  ]);
});
