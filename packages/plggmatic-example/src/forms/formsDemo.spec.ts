// @plgg-test-environment dom
//
// Ticket 12's runnable proof, driven in the in-house DOM: an invalid submit
// shows a field error and creates NOTHING; a valid submit disables the form,
// completes, and toasts success; a destructive delete asks the confirm dialog
// (cancel is a no-op, confirm executes and toasts).
import {
  test,
  check,
  all,
  toBe,
  toContain,
  beforeEach,
  afterEach,
} from "plgg-test";
import { sandbox } from "plgg-view/client";
import { program } from "./formsDemo.ts";

let stop: () => void = () => {};

const mount = (): Element => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = sandbox(program)(root);
  return root;
};

const click = (t: EventTarget): void =>
  void t.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );

const byText = (
  root: Element,
  sel: string,
  txt: string,
): Element | undefined =>
  Array.from(root.querySelectorAll(sel)).find(
    (n: Element) =>
      (n.textContent ?? "").includes(txt),
  );

const clickText = (
  root: Element,
  sel: string,
  txt: string,
): void => {
  const el = byText(root, sel, txt);
  if (el !== undefined) {
    click(el);
  }
};

const submitForm = (root: Element): void => {
  const form = root.querySelector("form");
  if (form !== null) {
    form.dispatchEvent(
      new Event("submit", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }
};

// the in-house selector engine has no `#id`; use `[id=…]`.
const typeInto = (
  root: Element,
  id: string,
  value: string,
): void => {
  const el = root.querySelector(`[id="${id}"]`);
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement
  ) {
    el.value = value;
    el.dispatchEvent(
      new Event("input", { bubbles: true }),
    );
  }
};

const flush = (): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, 0),
  );

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
});

test("the form renders its labelled controls and submit", () => {
  const root = mount();
  return all([
    check(
      root.querySelector("form") !== null,
      toBe(true),
    ),
    check(
      root.querySelector('[id="title"]') !== null,
      toBe(true),
    ),
    check(root.textContent, toContain("Body")),
  ]);
});

test("an invalid submit shows a field error and creates nothing", () => {
  const root = mount();
  submitForm(root);
  return all([
    check(
      root.querySelector('[aria-invalid="true"]') !==
        null,
      toBe(true),
    ),
    check(
      root.textContent,
      toContain("Required"),
    ),
    check(
      root.querySelector(".fd-note") === null,
      toBe(true),
    ),
  ]);
});

test("a valid submit creates a note and toasts success", async () => {
  const root = mount();
  typeInto(root, "title", "First note");
  typeInto(root, "body", "some body");
  submitForm(root);
  await flush();
  return all([
    check(
      root.querySelector(".fd-note") !== null,
      toBe(true),
    ),
    check(
      root.textContent,
      toContain("Note created"),
    ),
    check(
      root.textContent,
      toContain("First note"),
    ),
  ]);
});

test("delete asks the dialog; cancel is a no-op, confirm removes and toasts", async () => {
  const root = mount();
  typeInto(root, "title", "Doomed");
  typeInto(root, "body", "x");
  submitForm(root);
  await flush();
  // open the delete dialog (the note's Delete), then cancel
  clickText(root, ".fd-note button", "Delete");
  const asked =
    root.querySelector('[role="dialog"]') !== null;
  clickText(root, ".pm-dialog button", "Cancel");
  const afterCancel =
    root.querySelector('[role="dialog"]') === null &&
    root.querySelector(".fd-note") !== null;
  // reopen and confirm via the DIALOG's Delete button
  clickText(root, ".fd-note button", "Delete");
  clickText(root, ".pm-dialog button", "Delete");
  const removed =
    root.querySelector(".fd-note") === null;
  return all([
    check(asked, toBe(true)),
    check(afterCancel, toBe(true)),
    check(removed, toBe(true)),
    check(
      root.textContent,
      toContain("Note deleted"),
    ),
  ]);
});
