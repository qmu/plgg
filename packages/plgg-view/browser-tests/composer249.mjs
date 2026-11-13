import {
  el,
  managedHost,
  attr,
  onEvent,
  mapHtml,
  fadeOut,
} from "../dist/index.es.js";
import { makeRenderer } from "../dist/client.es.js";
import { some, none } from "plgg";
const root = document.querySelector("#app"),
  output = document.querySelector("#result");
const checks = [];
const verify = (name, passed) =>
  checks.push({ name, passed });
const editors = new Map(),
  files = new Map(),
  cleanup = [],
  messages = [],
  eventIdentities = [];
let composing = false;
const editorLife = (id) => ({
  mount: (host, dispatch) => {
    const editor = document.createElement("div");
    editor.className = "input";
    editor.contentEditable = "true";
    editor.textContent =
      "@paper " + id + " draft";
    host.append(editor);
    editors.set(id, editor);
    const handler = (event) => {
      if (
        event instanceof KeyboardEvent &&
        event.key === "Tab"
      ) {
        event.preventDefault();
        editor.textContent =
          "@紙面企画 " + id + " draft";
        dispatch("mention:" + id);
      }
    };
    editor.addEventListener("keydown", handler);
    return () => {
      cleanup.push(id);
      editor.removeEventListener(
        "keydown",
        handler,
      );
    };
  },
  update: () => {},
});
const lifecycles = new Map(
  ["a", "b"].map((id) => [id, editorLife(id)]),
);
// The wrappers are keyed too: identity belongs to the whole composer, not its slot.
import { key } from "../dist/index.es.js";
const keyedView = (ids) =>
  mapHtml((message) => message)(
    el(
      "section",
      [],
      ids.map((id) =>
        el(
          "div",
          [key(id), attr("class", "editor")],
          [
            managedHost(
              id,
              [],
              lifecycles.get(id),
            ),
            el(
              "input",
              [
                attr("type", "file"),
                attr("data-file", id),
                onEvent("change", (event) => {
                  eventIdentities.push(event);
                  return event.target instanceof
                    HTMLInputElement
                    ? some({
                        id,
                        files: event.target.files,
                      })
                    : none();
                }),
              ],
              [],
            ),
          ],
        ),
      ),
    ),
  );
const render = makeRenderer(root, (message) =>
  messages.push(message),
);
render(keyedView(["a", "b"]));
for (const id of ["a", "b"]) {
  const editor = editors.get(id);
  editor.focus();
  editor.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    }),
  );
  const input = root.querySelector(
      `[data-file="${id}"]`,
    ),
    dt = new DataTransfer();
  dt.items.add(
    new File([id], id + ".txt", {
      type: "text/plain",
    }),
  );
  input.files = dt.files;
  files.set(id, input.files);
  const change = new Event("change", {
    bubbles: true,
  });
  input.dispatchEvent(change);
  verify(
    "raw FileList identity " + id,
    messages.at(-1).files === input.files &&
      eventIdentities.at(-1) === change,
  );
}
const b = editors.get("b");
b.focus();
const range = document.createRange();
range.setStart(b.firstChild, 3);
range.collapse(true);
const selection = getSelection();
selection.removeAllRanges();
selection.addRange(range);
const decoderRoot = document.createElement("div");
document.body.append(decoderRoot);
const decode = makeRenderer(
  decoderRoot,
  (message) => messages.push(message),
);
decode(
  el(
    "form",
    [
      onEvent("compositionstart", (event) => {
        verify(
          "CompositionEvent preserved",
          event instanceof CompositionEvent &&
            event.data === "に",
        );
        composing = true;
        return none();
      }),
      onEvent("compositionend", (event) => {
        composing = false;
        return event instanceof CompositionEvent
          ? some(event.data)
          : none();
      }),
      onEvent("keydown", (event) =>
        event instanceof KeyboardEvent &&
        event.key === "Enter" &&
        !event.isComposing &&
        !composing
          ? some("send")
          : none(),
      ),
      onEvent("input", (event) => {
        verify(
          "InputEvent isComposing/data preserved",
          event instanceof InputEvent &&
            event.isComposing &&
            event.data === "に",
        );
        return none();
      }),
      onEvent("drop", (event) => {
        verify(
          "DragEvent DataTransfer identity",
          event instanceof DragEvent &&
            event.dataTransfer === dropData,
        );
        event.preventDefault();
        return none();
      }),
    ],
    [],
  ),
);
const form = decoderRoot.firstElementChild;
form.dispatchEvent(
  new CompositionEvent("compositionstart", {
    data: "に",
    bubbles: true,
  }),
);
form.dispatchEvent(
  new InputEvent("input", {
    data: "に",
    isComposing: true,
    bubbles: true,
  }),
);
const before = messages.length;
form.dispatchEvent(
  new KeyboardEvent("keydown", {
    key: "Enter",
    isComposing: true,
    bubbles: true,
  }),
);
verify(
  "IME Enter does not send",
  messages.length === before,
);
render(keyedView(["a", "b"]));
render(keyedView(["b", "a"]));
render(keyedView(["b", "a"]));
verify(
  "two editor identities retained",
  editors.get("a").textContent ===
    "@紙面企画 a draft" && editors.get("b") === b,
);
verify(
  "focused editor retained during reorder",
  document.activeElement === b,
);
verify(
  "selection retained during reorder",
  getSelection().anchorNode === b.firstChild &&
    getSelection().anchorOffset === 3,
);
verify(
  "IME composition survives unrelated renders",
  composing,
);
verify(
  "two FileLists retained separately",
  ["a", "b"].every(
    (id) =>
      root.querySelector(`[data-file="${id}"]`)
        .files === files.get(id) &&
      files.get(id)[0].name === id + ".txt",
  ),
);
form.dispatchEvent(
  new CompositionEvent("compositionend", {
    data: "日本",
    bubbles: true,
  }),
);
verify(
  "compositionend decodes Japanese data",
  messages.at(-1) === "日本",
);
const dropData = new DataTransfer();
dropData.items.add(
  new File(["drop"], "drop.txt"),
);
const drop = new DragEvent("drop", {
  dataTransfer: dropData,
  bubbles: true,
  cancelable: true,
});
form.dispatchEvent(drop);
verify(
  "drop prevention stays synchronous",
  drop.defaultPrevented,
);
// A failed send is an unrelated model update: the external owner retains drafts.
render(keyedView(["b", "a"]));
verify(
  "failed-send redraw retains draft",
  b.textContent === "@紙面企画 b draft",
);
render(keyedView(["b"]));
const count = messages.length;
editors
  .get("a")
  .dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab" }),
  );
verify(
  "removed editor listener is cleaned",
  messages.length === count &&
    cleanup.join(",") === "a",
);
render.dispose();
render.dispose();
verify(
  "cleanup once for each host",
  cleanup.join(",") === "a,b",
);
decode.dispose();
// 終端化と退出中の隣接要素を、実ブラウザのDOM/focus/座標でも確認する。
const terminalRoot =
  document.createElement("div");
document.body.append(terminalRoot);
const terminalMessages = [];
let terminalCleanup = 0;
const terminalRender = makeRenderer(
  terminalRoot,
  (message) => {
    terminalMessages.push(message);
    if (message === "first")
      terminalRender.dispose();
  },
);
terminalRender(
  managedHost("terminal", [], {
    mount: (_node, dispatch) => {
      dispatch("first");
      dispatch("second");
      return () => terminalCleanup++;
    },
    update: () => {},
  }),
);
verify(
  "queued messages stop after disposal inside first outer dispatch",
  terminalMessages.join(",") === "first" &&
    terminalCleanup === 1 &&
    terminalRoot.childNodes.length === 0,
);
terminalRoot.remove();
const exitRoot = document.createElement("div");
document.body.append(exitRoot);
const focusedInput =
  document.createElement("input");
let finishExit = () => {};
const exitRender = makeRenderer(
  exitRoot,
  () => {},
  (_node, motion) =>
    motion.durationMs === 50
      ? new Promise((resolve) => {
          finishExit = resolve;
        })
      : Promise.resolve(),
);
const row = (id, attrs = []) =>
  el(
    "div",
    [
      key(id),
      attr("data-node", id),
      attr("style", "height:24px"),
      ...attrs,
    ],
    [],
  );
const predecessor = row("a"),
  leaving = row("x", [fadeOut(50)]),
  focusedHost = managedHost(
    "b",
    [attr("data-node", "b")],
    {
      mount: (node) => {
        node.append(focusedInput);
        return () => {};
      },
      update: () => {},
    },
  );
exitRender(
  el(
    "div",
    [attr("style", "position:relative")],
    [predecessor, leaving, focusedHost],
  ),
);
focusedInput.focus();
const leavingNode = exitRoot.querySelector(
    '[data-node="x"]',
  ),
  beforeExit =
    leavingNode.getBoundingClientRect();
exitRender(
  el(
    "div",
    [attr("style", "position:relative")],
    [predecessor, focusedHost],
  ),
);
const duringExit =
  leavingNode.getBoundingClientRect();
verify(
  "unchanged predecessor stays before exiting sibling",
  [...exitRoot.firstElementChild.children]
    .map((node) => node.getAttribute("data-node"))
    .join(",") === "a,x,b",
);
verify(
  "focused subtree is not detached by exit ordering",
  document.activeElement === focusedInput,
);
verify(
  "exit keeps its original visual footprint",
  Math.abs(beforeExit.top - duringExit.top) < 1 &&
    Math.abs(beforeExit.left - duringExit.left) <
      1,
);
finishExit();
await Promise.resolve();
verify(
  "exit settlement removes only the leaving sibling",
  [...exitRoot.firstElementChild.children]
    .map((node) => node.getAttribute("data-node"))
    .join(",") === "a,b",
);
const suffixLeaving = row("suffix-x", [
    fadeOut(50),
  ]),
  last = row("c");
exitRender(
  el(
    "div",
    [attr("style", "position:relative")],
    [
      focusedHost,
      suffixLeaving,
      predecessor,
      last,
    ],
  ),
);
focusedInput.focus();
exitRender(
  el(
    "div",
    [attr("style", "position:relative")],
    [focusedHost, predecessor, last],
  ),
);
verify(
  "exit after focus stays before unchanged successors",
  [...exitRoot.firstElementChild.children]
    .map((node) => node.getAttribute("data-node"))
    .join(",") === "b,suffix-x,a,c" &&
    document.activeElement === focusedInput,
);
finishExit();
await Promise.resolve();
exitRender.dispose();
exitRoot.remove();
output.textContent = JSON.stringify(
  {
    passed: checks.every((c) => c.passed),
    checks,
    requests: 0,
  },
  null,
  2,
);
document.body.dataset.passed = String(
  checks.every((c) => c.passed),
);
