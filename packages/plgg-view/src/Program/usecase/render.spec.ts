// @vitest-environment happy-dom
import { test, expect } from "vitest";
import {
  el,
  text,
  div,
  span,
  button,
  input,
  form,
} from "plgg-view/Html/model/element";
import { some, none, isSome } from "plgg";
import {
  attr,
  class_,
  type_,
  value_,
  onClick,
  onInput,
  onSubmit,
  key,
  fadeIn,
  fadeOut,
  type Motion,
} from "plgg-view/Html/model/Attribute";
import { Html } from "plgg-view/Html/model/Html";
import {
  style_,
  hashClass,
} from "plgg-view/Style/usecase/style_";
import {
  p,
  bg,
} from "plgg-view/Style/usecase/utilities";
import {
  makeRenderer,
  waapiPlay,
  type Play,
} from "plgg-view/Program/usecase/render";

type Msg =
  | { kind: "Clicked"; tag: string }
  | { kind: "Typed"; value: string }
  | { kind: "Submitted" };

const collect = () => {
  const msgs: Msg[] = [];
  return {
    msgs,
    dispatch: (m: Msg) => {
      msgs.push(m);
    },
  };
};

const noop = (): void => {};

// --- first paint ---------------------------------------------------------

test("first paint builds DOM with text and safe attributes", () => {
  const root = document.createElement("div");
  makeRenderer<never>(
    root,
    noop,
  )(
    el(
      "p",
      [class_("greeting")],
      [text("hi & bye")],
    ),
  );
  const p = root.firstElementChild;
  expect(p?.tagName).toBe("P");
  expect(p?.getAttribute("class")).toBe(
    "greeting",
  );
  expect(p?.textContent).toBe("hi & bye");
});

test("attributes with unsafe names are dropped", () => {
  const root = document.createElement("div");
  makeRenderer<never>(
    root,
    noop,
  )(el("div", [attr("bad name", "x")], []));
  expect(
    root.firstElementChild?.hasAttribute(
      "bad name",
    ),
  ).toBe(false);
});

test("client neutralizes a javascript: URL (parity with SSR)", () => {
  const root = document.createElement("div");
  makeRenderer<never>(
    root,
    noop,
  )(
    el(
      "a",
      [attr("href", "javascript:alert(1)")],
      [],
    ),
  );
  expect(
    root.firstElementChild?.getAttribute("href"),
  ).toBe("#");
});

test("client drops an on* attribute name", () => {
  const root = document.createElement("div");
  makeRenderer<never>(
    root,
    noop,
  )(el("img", [attr("onerror", "alert(1)")], []));
  expect(
    root.firstElementChild?.hasAttribute(
      "onerror",
    ),
  ).toBe(false);
});

// --- handlers ------------------------------------------------------------

test("a click handler dispatches its Msg", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  makeRenderer<Msg>(
    root,
    dispatch,
  )(
    button(
      [
        onClick<Msg>({
          kind: "Clicked",
          tag: "a",
        }),
      ],
      [text("Go")],
    ),
  );
  root.firstElementChild?.dispatchEvent(
    new Event("click"),
  );
  expect(msgs).toEqual([
    { kind: "Clicked", tag: "a" },
  ]);
});

test("an input handler dispatches with the target value", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  makeRenderer<Msg>(
    root,
    dispatch,
  )(
    input(
      [
        onInput<Msg>((value) => ({
          kind: "Typed",
          value,
        })),
      ],
      [],
    ),
  );
  const node = root.firstElementChild;
  if (node instanceof HTMLInputElement) {
    node.value = "abc";
    node.dispatchEvent(new Event("input"));
  }
  expect(msgs).toEqual([
    { kind: "Typed", value: "abc" },
  ]);
});

test("a submit handler prevents default and dispatches", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  makeRenderer<Msg>(
    root,
    dispatch,
  )(
    form(
      [onSubmit<Msg>({ kind: "Submitted" })],
      [],
    ),
  );
  const evt = new Event("submit", {
    cancelable: true,
  });
  root.firstElementChild?.dispatchEvent(evt);
  expect(evt.defaultPrevented).toBe(true);
  expect(msgs).toEqual([{ kind: "Submitted" }]);
});

test("a re-render re-points a handler without duplicating or going stale", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  const render = makeRenderer<Msg>(
    root,
    dispatch,
  );
  render(
    button(
      [
        onClick<Msg>({
          kind: "Clicked",
          tag: "a",
        }),
      ],
      [text("Go")],
    ),
  );
  const node = root.firstElementChild;
  node?.dispatchEvent(new Event("click"));
  // same node, new handler — one listener, re-pointed
  render(
    button(
      [
        onClick<Msg>({
          kind: "Clicked",
          tag: "b",
        }),
      ],
      [text("Go")],
    ),
  );
  expect(root.firstElementChild).toBe(node);
  node?.dispatchEvent(new Event("click"));
  expect(msgs).toEqual([
    { kind: "Clicked", tag: "a" },
    { kind: "Clicked", tag: "b" },
  ]);
});

test("a dropped handler stops dispatching", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  const render = makeRenderer<Msg>(
    root,
    dispatch,
  );
  render(
    button(
      [
        onClick<Msg>({
          kind: "Clicked",
          tag: "a",
        }),
      ],
      [text("Go")],
    ),
  );
  const node = root.firstElementChild;
  render(button([], [text("Go")]));
  node?.dispatchEvent(new Event("click"));
  expect(msgs).toEqual([]);
});

// --- the reliability win: node reuse preserves focus ---------------------

test("re-render reuses the input node and preserves focus + caret", () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const render = makeRenderer<Msg>(root, noop);
  const viewOf = (draft: string): Html<Msg> =>
    div(
      [],
      [
        input(
          [
            type_("text"),
            value_(draft),
            onInput<Msg>((value) => ({
              kind: "Typed",
              value,
            })),
          ],
          [],
        ),
      ],
    );
  render(viewOf(""));
  const first = root.querySelector("input");
  expect(first).toBeInstanceOf(HTMLInputElement);
  if (first instanceof HTMLInputElement) {
    first.focus();
    expect(document.activeElement).toBe(first);
    render(viewOf("ab"));
    // the SAME node is reused — a full re-render would have lost focus here
    expect(root.querySelector("input")).toBe(
      first,
    );
    expect(document.activeElement).toBe(first);
    expect(first.value).toBe("ab");
  }
  document.body.removeChild(root);
});

// --- diffing internals ---------------------------------------------------

test("a text node is reused and only its data updated", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  const textNode =
    root.firstElementChild?.firstChild;
  render(el("p", [], [text("b")]));
  expect(root.firstElementChild?.firstChild).toBe(
    textNode,
  );
  expect(root.textContent).toBe("b");
});

test("a changed attribute is patched and a dropped one removed", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    el("div", [class_("a"), attr("id", "x")], []),
  );
  const node = root.firstElementChild;
  render(el("div", [class_("b")], []));
  expect(root.firstElementChild).toBe(node);
  expect(node?.getAttribute("class")).toBe("b");
  expect(node?.hasAttribute("id")).toBe(false);
});

test("a tag change replaces the node", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(div([], [text("x")]));
  const node = root.firstElementChild;
  render(span([], [text("x")]));
  const next = root.firstElementChild;
  expect(next).not.toBe(node);
  expect(next?.tagName).toBe("SPAN");
});

test("a text<->element swap replaces the node both ways", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("x")]));
  render(el("p", [], [div([], [])]));
  expect(
    root.firstElementChild?.firstElementChild
      ?.tagName,
  ).toBe("DIV");
  render(el("p", [], [text("y")]));
  expect(root.textContent).toBe("y");
});

test("children are appended and surplus removed", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    el("ul", [], [el("li", [], [text("1")])]),
  );
  const ul = root.firstElementChild;
  render(
    el(
      "ul",
      [],
      [
        el("li", [], [text("1")]),
        el("li", [], [text("2")]),
      ],
    ),
  );
  expect(ul?.children.length).toBe(2);
  expect(ul?.children[1]?.textContent).toBe("2");
  render(el("ul", [], []));
  expect(ul?.children.length).toBe(0);
});

// --- controlled form properties (value / checked) ------------------------

test("the value property is driven so a reset clears the input", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(input([value_("hello")], []));
  const node = root.firstElementChild;
  expect(
    node instanceof HTMLInputElement &&
      node.value,
  ).toBe("hello");
  render(input([value_("")], []));
  expect(
    node instanceof HTMLInputElement &&
      node.value,
  ).toBe("");
});

test("removing the value attribute resets the property", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(input([value_("hello")], []));
  const node = root.firstElementChild;
  render(input([], []));
  expect(
    node instanceof HTMLInputElement &&
      node.value,
  ).toBe("");
});

test("a textarea's value is also driven as a property", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("textarea", [value_("a")], []));
  const node = root.firstElementChild;
  expect(
    node instanceof HTMLTextAreaElement &&
      node.value,
  ).toBe("a");
  // re-render with the SAME value — the no-op guard skips the write
  render(el("textarea", [value_("a")], []));
  expect(
    node instanceof HTMLTextAreaElement &&
      node.value,
  ).toBe("a");
  render(el("textarea", [value_("b")], []));
  expect(
    node instanceof HTMLTextAreaElement &&
      node.value,
  ).toBe("b");
});

test("an already-checked box stays checked across a re-render", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  const checkbox = input(
    [type_("checkbox"), attr("checked", "")],
    [],
  );
  render(checkbox);
  const node = root.firstElementChild;
  render(checkbox); // checked already true — the guard skips the write
  expect(
    node instanceof HTMLInputElement &&
      node.checked,
  ).toBe(true);
});

test("the checked property toggles with the attribute's presence", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    input(
      [type_("checkbox"), attr("checked", "")],
      [],
    ),
  );
  const node = root.firstElementChild;
  expect(
    node instanceof HTMLInputElement &&
      node.checked,
  ).toBe(true);
  render(input([type_("checkbox")], []));
  expect(
    node instanceof HTMLInputElement &&
      node.checked,
  ).toBe(false);
});

// --- robustness: tolerate DOM drift --------------------------------------

test("rebuilds when the container was externally emptied", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  root.replaceChildren(); // external clear between renders
  render(el("p", [], [text("b")]));
  expect(root.textContent).toBe("b");
});

test("replaces when the DOM node drifted from the old vnode kind", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  const p = root.firstElementChild;
  // swap the child text node for an element behind the renderer's back
  p?.replaceChildren(document.createElement("b"));
  render(el("p", [], [text("c")]));
  expect(p?.textContent).toBe("c");
});

test("tolerates externally-added child nodes when growing a list", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    el("ul", [], [el("li", [], [text("1")])]),
  );
  const ul = root.firstElementChild;
  ul?.appendChild(document.createElement("li")); // external node
  render(
    el(
      "ul",
      [],
      [
        el("li", [], [text("1")]),
        el("li", [], [text("2")]),
      ],
    ),
  );
  expect(
    (ul?.querySelectorAll("li").length ?? 0) >= 2,
  ).toBe(true);
});

test("style_ sets and patches the class attribute (hook + atoms)", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("div", [style_("box", p(2))], []));
  const node = root.firstElementChild;
  expect(node?.getAttribute("class")).toBe(
    `box ${hashClass("|padding:0.5rem")}`,
  );
  render(
    el("div", [style_(p(4), bg("primary"))], []),
  );
  expect(root.firstElementChild).toBe(node);
  expect(node?.getAttribute("class")).toBe(
    `${hashClass("|padding:1rem")} ${hashClass("|background-color:#1f6b54")}`,
  );
});

// --- animation: enter / exit transitions ---------------------------------

const fadeMotion: Motion = {
  from: { opacity: some(0), transform: none() },
  to: {
    opacity: some(1),
    transform: some("translateY(0)"),
  },
  durationMs: 100,
  easing: "ease-out",
};

const scaleMotion: Motion = {
  from: {
    opacity: none(),
    transform: some("scale(0.5)"),
  },
  to: {
    opacity: none(),
    transform: some("scale(1)"),
  },
  durationMs: 100,
  easing: "linear",
};

test("an enter motion is played on a newly created node", () => {
  const root = document.createElement("div");
  const plays: Array<{
    node: Element;
    motion: Motion;
  }> = [];
  const play: Play = (node, motion) => {
    plays.push({ node, motion });
    return Promise.resolve();
  };
  // the static attr + handler exercise the no-op anim folds alongside the play
  makeRenderer<Msg>(
    root,
    noop,
    play,
  )(
    button(
      [
        class_("box"),
        onClick<Msg>({ kind: "Submitted" }),
        fadeIn(150),
      ],
      [text("hi")],
    ),
  );
  expect(plays.length).toBe(1);
  expect(plays[0]?.node).toBe(
    root.firstElementChild,
  );
  expect(plays[0]?.motion.durationMs).toBe(150);
});

test("an element with BOTH fadeIn and fadeOut plays enter on create and exit on removal", async () => {
  // regression: enterOf/exitOf must collect from any Anim directive, so a later
  // fadeOut (enter:none) must not clobber an earlier fadeIn's enter motion.
  const root = document.createElement("div");
  const plays: Array<{
    node: Element;
    motion: Motion;
  }> = [];
  let settle: () => void = () => undefined;
  const play: Play = (_node, motion) => {
    plays.push({ node: _node, motion });
    return new Promise<void>((resolve) => {
      settle = () => resolve();
    });
  };
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(
    el(
      "ul",
      [],
      [
        el(
          "li",
          [fadeIn(150), fadeOut(120)],
          [text("a")],
        ),
      ],
    ),
  );
  // enter (fadeIn) fired on create — was dropped before the keepSome fix
  expect(plays.length).toBe(1);
  expect(plays[0]?.motion.durationMs).toBe(150);
  settle();
  // remove it → exit (fadeOut) fires
  render(el("ul", [], []));
  expect(plays.length).toBe(2);
  expect(plays[1]?.motion.durationMs).toBe(120);
});

test("a node without an enter motion is not animated", () => {
  const root = document.createElement("div");
  let called = 0;
  const play: Play = () => {
    called += 1;
    return Promise.resolve();
  };
  makeRenderer<never>(
    root,
    noop,
    play,
  )(div([], [text("hi")]));
  expect(called).toBe(0);
});

test("an exit motion defers removal until it finishes", async () => {
  const root = document.createElement("div");
  let settle: () => void = () => undefined;
  const play: Play = () =>
    new Promise<void>((resolve) => {
      settle = () => resolve();
    });
  const render = makeRenderer<Msg>(
    root,
    noop,
    play,
  );
  // static attr + handler exercise exitOf's non-anim folds
  render(
    el(
      "ul",
      [],
      [
        el(
          "li",
          [
            class_("row"),
            onClick<Msg>({ kind: "Submitted" }),
            fadeOut(120),
          ],
          [text("x")],
        ),
      ],
    ),
  );
  const ul = root.firstElementChild;
  render(el("ul", [], []));
  // still present — removal awaits the exit animation
  expect(ul?.children.length).toBe(1);
  settle();
  await Promise.resolve();
  await Promise.resolve();
  expect(ul?.children.length).toBe(0);
});

test("a surplus non-element child is removed immediately", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a"), text("b")]));
  const p = root.firstElementChild;
  render(el("p", [], [text("a")]));
  expect(p?.childNodes.length).toBe(1);
  expect(p?.textContent).toBe("a");
});

test("a drifted element surplus with a text vnode is removed", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  const p = root.firstElementChild;
  // drift: swap the text node for an element behind the renderer's back
  p?.replaceChildren(document.createElement("b"));
  render(el("p", [], []));
  expect(p?.childNodes.length).toBe(0);
});

// --- waapiPlay: the default Web Animations seam ---------------------------

test("waapiPlay no-ops when the DOM lacks the Web Animations API", async () => {
  const node = document.createElement("div");
  await expect(
    waapiPlay(node, fadeMotion),
  ).resolves.toBeUndefined();
});

test("waapiPlay drives the WAAPI with translated keyframes and options", async () => {
  const node = document.createElement("div");
  const calls: Array<{
    frames: unknown;
    opts: unknown;
  }> = [];
  Object.defineProperty(node, "animate", {
    configurable: true,
    value: (frames: unknown, opts: unknown) => {
      calls.push({ frames, opts });
      return { finished: Promise.resolve() };
    },
  });
  await waapiPlay(node, fadeMotion);
  await waapiPlay(node, scaleMotion);
  expect(calls[0]?.frames).toEqual([
    { opacity: 0 },
    { opacity: 1, transform: "translateY(0)" },
  ]);
  expect(calls[0]?.opts).toEqual({
    duration: 100,
    easing: "ease-out",
    fill: "forwards",
  });
  expect(calls[1]?.frames).toEqual([
    { transform: "scale(0.5)" },
    { transform: "scale(1)" },
  ]);
});

test("waapiPlay swallows a cancelled animation", async () => {
  const node = document.createElement("div");
  Object.defineProperty(node, "animate", {
    configurable: true,
    value: () => ({
      finished: Promise.reject(
        new Error("cancelled"),
      ),
    }),
  });
  await expect(
    waapiPlay(node, fadeMotion),
  ).resolves.toBeUndefined();
});

test("waapiPlay honours prefers-reduced-motion", async () => {
  const node = document.createElement("div");
  let animated = false;
  Object.defineProperty(node, "animate", {
    configurable: true,
    value: () => {
      animated = true;
      return { finished: Promise.resolve() };
    },
  });
  const original = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
  await waapiPlay(node, fadeMotion);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: original,
  });
  expect(animated).toBe(false);
});

test("waapiPlay treats absent matchMedia as motion-allowed", async () => {
  const node = document.createElement("div");
  let animated = false;
  Object.defineProperty(node, "animate", {
    configurable: true,
    value: () => {
      animated = true;
      return { finished: Promise.resolve() };
    },
  });
  const original = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: undefined,
  });
  await waapiPlay(node, fadeMotion);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: original,
  });
  expect(animated).toBe(true);
});

// --- keyed reconcile + FLIP ----------------------------------------------

/** A keyed `li` carrying `k`, its text, and any extra attributes. */
const kli = (
  k: string,
  txt: string,
  ...extra: ReadonlyArray<
    | ReturnType<typeof key>
    | ReturnType<typeof fadeOut>
  >
) => el("li", [key(k), ...extra], [text(txt)]);

const kul = (
  ...kids: ReadonlyArray<ReturnType<typeof kli>>
) => el("ul", [], kids);

/** Records every play call so a test can assert what animated and with what. */
const spyPlay = () => {
  const calls: Array<{
    node: Element;
    motion: Motion;
  }> = [];
  const play: Play = (node, motion) => {
    calls.push({ node, motion });
    return Promise.resolve();
  };
  return { calls, play };
};

test("keyed children are reused and reordered by key, not index", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    kul(
      kli("a", "A"),
      kli("b", "B"),
      kli("c", "C"),
    ),
  );
  const ul = root.firstElementChild;
  const [a, b, c] = Array.from(
    ul?.children ?? [],
  );
  render(
    kul(
      kli("c", "C"),
      kli("a", "A"),
      kli("b", "B"),
    ),
  );
  const after = Array.from(ul?.children ?? []);
  // the SAME node objects, now in the new order — moved, not rebuilt
  expect(after).toEqual([c, a, b]);
  expect(
    after.map((n) => n.textContent).join(""),
  ).toBe("CAB");
});

test("a new keyed child fires enter; reused siblings do not", () => {
  const root = document.createElement("div");
  const { calls, play } = spyPlay();
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(kul(kli("a", "A")));
  calls.length = 0; // ignore the first paint's enters
  render(
    kul(
      kli("a", "A"),
      kli("b", "B", fadeIn(150)),
    ),
  );
  const ul = root.firstElementChild;
  const b = ul?.children[1];
  expect(calls.length).toBe(1);
  expect(calls[0]?.node).toBe(b);
  expect(calls[0]?.motion.durationMs).toBe(150);
});

test("deleting a middle keyed child fades that node, then detaches it", async () => {
  const root = document.createElement("div");
  let settle: () => void = () => undefined;
  const play: Play = (node) =>
    node instanceof HTMLLIElement
      ? new Promise<void>((resolve) => {
          settle = () => resolve();
        })
      : Promise.resolve();
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(
    kul(
      kli("a", "A", fadeOut(120)),
      kli("b", "B", fadeOut(120)),
      kli("c", "C", fadeOut(120)),
    ),
  );
  const ul = root.firstElementChild;
  const b = Array.from(ul?.children ?? [])[1];
  render(
    kul(
      kli("a", "A", fadeOut(120)),
      kli("c", "C", fadeOut(120)),
    ),
  );
  // b is the row that leaves — held in the DOM until its exit (fade) finishes
  expect(b).toBeInstanceOf(HTMLLIElement);
  if (b instanceof HTMLElement) {
    expect(ul?.contains(b)).toBe(true);
  }
  settle();
  await Promise.resolve();
  await Promise.resolve();
  const remaining = Array.from(
    ul?.children ?? [],
  );
  expect(
    remaining.map((n) => n.textContent).join(""),
  ).toBe("AC");
});

test("a keyed exit lifts the leaving row out of flow so survivors take its space (it fades in place)", () => {
  const root = document.createElement("div");
  // play never settles, so the node is held in the DOM for inspection
  const play: Play = () =>
    new Promise<void>(() => undefined);
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(
    kul(
      kli("a", "A", fadeOut(120)),
      kli("b", "B", fadeOut(120)),
    ),
  );
  const ul = root.firstElementChild;
  // remove "a" — the leaving row is taken out of flow (absolute, border-box at
  // its current box) so its followers immediately close up and FLIP into place;
  // it fades where it was rather than collapsing/squishing.
  const a = Array.from(ul?.children ?? [])[0];
  render(kul(kli("b", "B", fadeOut(120))));
  if (a instanceof HTMLElement) {
    expect(a.style.position).toBe("absolute");
    expect(a.style.boxSizing).toBe("border-box");
  }
  // held in the DOM until its fade finishes (play never settles in this test)
  expect(ul?.contains(a ?? null)).toBe(true);
});

test("an exiting middle row keeps its DOM position — survivors don't leapfrog it", () => {
  const root = document.createElement("div");
  // play never settles, so the exiting node is held in the DOM for inspection
  const play: Play = () =>
    new Promise<void>(() => undefined);
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(
    kul(
      kli("a", "A", fadeOut(120)),
      kli("b", "B", fadeOut(120)),
      kli("c", "C", fadeOut(120)),
    ),
  );
  const ul = root.firstElementChild;
  const [a, b, c] = Array.from(
    ul?.children ?? [],
  );
  // delete the middle row — it collapses IN PLACE, so the reorder walk must
  // not move "c" in front of it (the old walk teleported "b" to the bottom)
  render(
    kul(
      kli("a", "A", fadeOut(120)),
      kli("c", "C", fadeOut(120)),
    ),
  );
  expect(Array.from(ul?.children ?? [])).toEqual([
    a,
    b,
    c,
  ]);
});

test("deleting the ONLY remaining keyed row still exits via the keyed path (out of flow + fade, not a bare detach)", () => {
  const root = document.createElement("div");
  // play never settles, so the node is held in the DOM for inspection
  const play: Play = () =>
    new Promise<void>(() => undefined);
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(kul(kli("a", "A", fadeOut(120))));
  const ul = root.firstElementChild;
  const a = Array.from(ul?.children ?? [])[0];
  // empty the list — an emptied fully-keyed list must NOT fall back to the
  // index path's bare surplus removal (which would detach with no fade). It
  // takes the keyed path: lifted out of flow and faded, held until the fade ends
  // (the container's height eases shut around it at runtime).
  render(kul());
  if (a instanceof HTMLElement) {
    expect(a.style.position).toBe("absolute");
    expect(ul?.contains(a)).toBe(true);
  }
});

test("deleting a keyed child with no exit motion detaches it at once", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(kul(kli("a", "A"), kli("b", "B")));
  const ul = root.firstElementChild;
  render(kul(kli("a", "A")));
  expect(ul?.children.length).toBe(1);
  expect(ul?.textContent).toBe("A");
});

test("a reused key with a changed tag is replaced, not patched", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(kul(kli("a", "A")));
  const ul = root.firstElementChild;
  const oldNode = ul?.firstElementChild;
  render(
    el(
      "ul",
      [],
      [el("p", [key("a")], [text("A2")])],
    ),
  );
  const newNode = ul?.firstElementChild;
  expect(newNode).not.toBe(oldNode);
  expect(newNode?.tagName).toBe("P");
  expect(newNode?.textContent).toBe("A2");
});

test("a reused key with the same tag patches in place", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(kul(kli("a", "A")));
  const ul = root.firstElementChild;
  const node = ul?.firstElementChild;
  render(kul(kli("a", "A-edited")));
  expect(ul?.firstElementChild).toBe(node);
  expect(node?.textContent).toBe("A-edited");
});

test("a node mid-exit is skipped when its key returns (fresh node, not the fading one)", async () => {
  const root = document.createElement("div");
  let settle: () => void = () => undefined;
  const play: Play = () =>
    new Promise<void>((resolve) => {
      settle = () => resolve();
    });
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(kul(kli("a", "A", fadeOut(120))));
  const ul = root.firstElementChild;
  const exiting = ul?.firstElementChild;
  render(el("ul", [], [])); // 'a' starts exiting (held in DOM)
  render(kul(kli("a", "A", fadeOut(120)))); // 'a' returns
  const live = Array.from(
    ul?.children ?? [],
  ).filter((n) => n !== exiting);
  // a brand-new node serves the returning key — not the one fading away
  expect(live.length).toBe(1);
  expect(live[0]).not.toBe(exiting);
  settle();
  await Promise.resolve();
  await Promise.resolve();
  expect(ul?.children.length).toBe(1);
});

test("a survivor FLIPs from its old box to its new one when it moves", () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const { calls, play } = spyPlay();
  const render = makeRenderer<never>(
    root,
    noop,
    play,
  );
  render(kul(kli("a", "A"), kli("b", "B")));
  const ul = root.firstElementChild;
  // stub layout: each row's top tracks its live sibling index, so a reorder
  // makes getBoundingClientRect report a real positional delta (happy-dom
  // otherwise returns all-zero rects and FLIP would never trigger).
  const stub = (el: Element): void => {
    Object.defineProperty(
      el,
      "getBoundingClientRect",
      {
        configurable: true,
        value: (): DOMRect =>
          new DOMRect(
            0,
            Array.from(
              el.parentElement?.children ?? [],
            ).indexOf(el) * 10,
            0,
            0,
          ),
      },
    );
  };
  Array.from(ul?.children ?? []).forEach(stub);
  calls.length = 0;
  render(kul(kli("b", "B"), kli("a", "A")));
  // both survivors moved one slot → each gets a transform-only FLIP motion
  const flips = calls.filter((c) =>
    isSome(c.motion.from.transform),
  );
  expect(flips.length).toBe(2);
  expect(flips[0]?.motion.durationMs).toBe(200);
  document.body.removeChild(root);
});
