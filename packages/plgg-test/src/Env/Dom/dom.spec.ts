import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test/index";
import {
  makeElement,
  makeText,
  bubblePath,
  activeElement,
  resetFocus,
} from "./node.js";
import { makeDom } from "./window.js";
import {
  DomRectCtor,
  MouseEventCtor,
} from "./event.js";
import { queryAll, queryOne } from "./select.js";
import {
  installDom,
  elementBrand,
  textBrand,
} from "./install.js";
import { DomElement } from "./types.js";

// The in-house DOM is exercised end-to-end by plgg-view/example; these
// unit specs cover it directly inside plgg-test (the package that owns it),
// against its typed factory exports — no DOM-lib globals, no escape hatches.

const kids =
  (
    el: DomElement,
  ): ((
    selector: string,
  ) => ReadonlyArray<DomElement>) =>
  (selector) =>
    queryAll(el, selector, (n) =>
      n.elementChildren(),
    );

// --- elements: attributes, properties, style ---------------------------

test("an element uppercases its tag and reflects attributes", () => {
  const el = makeElement("div");
  el.setAttribute("id", "x");
  return all([
    check(el.tagName, toBe("DIV")),
    check(el.getAttribute("id"), toBe("x")),
    check(el.hasAttribute("id"), toBe(true)),
    check(
      el.getAttribute("missing") === null,
      toBe(true),
    ),
  ]);
});

test("removeAttribute drops the attribute", () => {
  const el = makeElement("div");
  el.setAttribute("data-x", "1");
  el.removeAttribute("data-x");
  return check(
    el.hasAttribute("data-x"),
    toBe(false),
  );
});

test("value and checked are driveable properties", () => {
  const el = makeElement("input");
  el.value = "hi";
  el.checked = true;
  return all([
    check(el.value, toBe("hi")),
    check(el.checked, toBe(true)),
  ]);
});

test("rel and target reflect their attributes, defaulting to ''", () => {
  const a = makeElement("a");
  const before = a.rel === "" && a.target === "";
  a.setAttribute("rel", "noopener external");
  a.setAttribute("target", "_blank");
  return all([
    check(before, toBe(true)),
    check(a.rel, toBe("noopener external")),
    check(a.target, toBe("_blank")),
  ]);
});

// --- tree mutation -----------------------------------------------------

test("appendChild moves a node out of its old parent", () => {
  const a = makeElement("div");
  const b = makeElement("div");
  const child = makeElement("span");
  a.appendChild(child);
  b.appendChild(child);
  return all([
    check(a.children.length, toBe(0)),
    check(b.children.length, toBe(1)),
    check(child.parentElement === b, toBe(true)),
  ]);
});

test("insertBefore positions a node, null appends", () => {
  const ul = makeElement("ul");
  const a = makeElement("li");
  const b = makeElement("li");
  const c = makeElement("li");
  ul.appendChild(a);
  ul.appendChild(c);
  ul.insertBefore(b, c);
  ul.insertBefore(makeElement("li"), null);
  const order = Array.from(ul.children);
  return all([
    check(order[0] === a, toBe(true)),
    check(order[1] === b, toBe(true)),
    check(order[2] === c, toBe(true)),
    check(ul.children.length, toBe(4)),
  ]);
});

test("insertBefore with an unknown ref appends", () => {
  const ul = makeElement("ul");
  const a = makeElement("li");
  ul.appendChild(a);
  const orphanRef = makeElement("li");
  const node = makeElement("li");
  ul.insertBefore(node, orphanRef);
  return check(
    ul.children[1] === node,
    toBe(true),
  );
});

test("removeChild and remove detach a node", () => {
  const ul = makeElement("ul");
  const a = makeElement("li");
  const b = makeElement("li");
  ul.appendChild(a);
  ul.appendChild(b);
  ul.removeChild(a);
  b.remove();
  return check(ul.children.length, toBe(0));
});

test("replaceChild swaps one node for another", () => {
  const ul = makeElement("ul");
  const a = makeElement("li");
  const b = makeElement("li");
  ul.appendChild(a);
  ul.replaceChild(b, a);
  return all([
    check(ul.children.length, toBe(1)),
    check(ul.children[0] === b, toBe(true)),
    check(a.parentElement === null, toBe(true)),
  ]);
});

test("replaceChildren clears then sets", () => {
  const ul = makeElement("ul");
  ul.appendChild(makeElement("li"));
  const fresh = makeElement("li");
  ul.replaceChildren(fresh);
  ul.replaceChildren();
  const a1 = check(ul.children.length, toBe(0));
  ul.replaceChildren(fresh);
  return all([
    a1,
    check(ul.children.length, toBe(1)),
    check(fresh.parentElement === ul, toBe(true)),
  ]);
});

test("contains reports self and descendants", () => {
  const root = makeElement("div");
  const mid = makeElement("div");
  const leaf = makeElement("span");
  const txt = makeText("hi");
  root.appendChild(mid);
  mid.appendChild(leaf);
  leaf.appendChild(txt);
  const outside = makeElement("div");
  return all([
    check(root.contains(root), toBe(true)),
    check(root.contains(leaf), toBe(true)),
    check(root.contains(txt), toBe(true)),
    check(root.contains(outside), toBe(false)),
    check(root.contains(null), toBe(false)),
  ]);
});

// --- traversal accessors -----------------------------------------------

test("firstChild, firstElementChild and nextSibling", () => {
  const p = makeElement("p");
  const txt = makeText("a");
  const span = makeElement("span");
  p.appendChild(txt);
  p.appendChild(span);
  return all([
    check(p.firstChild === txt, toBe(true)),
    check(
      p.firstElementChild === span,
      toBe(true),
    ),
    check(txt.nextSibling === span, toBe(true)),
    check(span.nextSibling === null, toBe(true)),
  ]);
});

test("a detached node has no sibling", () => {
  const orphan = makeElement("div");
  return check(
    orphan.nextSibling === null,
    toBe(true),
  );
});

test("childNodes is an array-like with item and iteration", () => {
  const p = makeElement("p");
  const a = makeText("a");
  const b = makeElement("b");
  p.appendChild(a);
  p.appendChild(b);
  return all([
    check(p.childNodes.length, toBe(2)),
    check(p.childNodes.item(0) === a, toBe(true)),
    check(
      p.childNodes.item(9) === null,
      toBe(true),
    ),
    check(
      Array.from(p.childNodes).length,
      toBe(2),
    ),
  ]);
});

test("parentElement is null when the parent is the document", () => {
  const { document } = makeDom();
  return all([
    check(
      document.body.parentElement === null,
      toBe(true),
    ),
    check(document.body.tagName, toBe("BODY")),
  ]);
});

// --- textContent / innerHTML -------------------------------------------

test("textContent reads the subtree and writes a single text node", () => {
  const div = makeElement("div");
  const span = makeElement("span");
  span.appendChild(makeText("inner"));
  div.appendChild(makeText("a "));
  div.appendChild(span);
  const a1 = check(
    div.textContent,
    toBe("a inner"),
  );
  div.textContent = "reset";
  const a2 = check(
    div.textContent,
    toBe("reset"),
  );
  div.textContent = "";
  return all([
    a1,
    a2,
    check(div.childNodes.length, toBe(0)),
  ]);
});

test("innerHTML = '' empties the element", () => {
  const div = makeElement("div");
  div.appendChild(makeElement("span"));
  div.innerHTML = "";
  return check(div.childNodes.length, toBe(0));
});

// --- events ------------------------------------------------------------

test("a dispatched event sets target and fires the listener", () => {
  const el = makeElement("button");
  const seen: Array<unknown> = [];
  el.addEventListener("click", (e) => {
    seen.push(e.target);
  });
  el.dispatchEvent(new Event("click"));
  return all([
    check(seen.length, toBe(1)),
    check(seen[0] === el, toBe(true)),
  ]);
});

test("a bubbling event climbs to an ancestor; a non-bubbling one does not", () => {
  const make = (): {
    parent: DomElement;
    child: DomElement;
  } => {
    const parent = makeElement("div");
    const child = makeElement("span");
    parent.appendChild(child);
    return { parent, child };
  };
  const bubbling = make();
  let up = 0;
  bubbling.parent.addEventListener(
    "click",
    () => {
      up = up + 1;
    },
  );
  bubbling.child.dispatchEvent(
    new Event("click", { bubbles: true }),
  );
  const direct = make();
  let up2 = 0;
  direct.parent.addEventListener("click", () => {
    up2 = up2 + 1;
  });
  direct.child.dispatchEvent(new Event("click"));
  return all([
    check(up, toBe(1)),
    check(up2, toBe(0)),
  ]);
});

test("an attached node bubbles to document and window", () => {
  const { window, document } = makeDom();
  const root = document.createElement("div");
  document.body.appendChild(root);
  let docHits = 0;
  let winHits = 0;
  document.addEventListener("click", () => {
    docHits = docHits + 1;
  });
  window.addEventListener("click", () => {
    winHits = winHits + 1;
  });
  root.dispatchEvent(
    new Event("click", { bubbles: true }),
  );
  return all([
    check(docHits, toBe(1)),
    check(winHits, toBe(1)),
  ]);
});

test("preventDefault on a cancelable event is reported", () => {
  const el = makeElement("form");
  el.addEventListener("submit", (e) => {
    e.preventDefault();
  });
  const evt = new Event("submit", {
    cancelable: true,
  });
  const result = el.dispatchEvent(evt);
  return all([
    check(evt.defaultPrevented, toBe(true)),
    check(result, toBe(false)),
  ]);
});

test("a removed listener no longer fires", () => {
  const el = makeElement("button");
  let n = 0;
  const fn = (): void => {
    n = n + 1;
  };
  el.addEventListener("click", fn);
  el.removeEventListener("click", fn);
  el.dispatchEvent(new Event("click"));
  return check(n, toBe(0));
});

test("stopPropagation halts bubbling at the target", () => {
  const parent = makeElement("div");
  const child = makeElement("span");
  parent.appendChild(child);
  let parentHits = 0;
  child.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  parent.addEventListener("click", () => {
    parentHits = parentHits + 1;
  });
  child.dispatchEvent(
    new Event("click", { bubbles: true }),
  );
  return check(parentHits, toBe(0));
});

test("MouseEvent carries button and modifier flags", () => {
  const evt = MouseEventCtor("click", {
    bubbles: true,
    cancelable: true,
    button: 2,
    metaKey: true,
  });
  const plain = MouseEventCtor("click");
  return all([
    check(evt.type, toBe("click")),
    check(evt.bubbles, toBe(true)),
    check(Reflect.get(evt, "button"), toBe(2)),
    check(
      Reflect.get(evt, "metaKey"),
      toBe(true),
    ),
    check(
      Reflect.get(evt, "ctrlKey"),
      toBe(false),
    ),
    check(Reflect.get(plain, "button"), toBe(0)),
  ]);
});

// --- DOMRect / layout stubs / focus ------------------------------------

test("DOMRect computes its edges and defaults to zeros", () => {
  const r = DomRectCtor(2, 3, 4, 5);
  const z = DomRectCtor();
  return all([
    check(r.left, toBe(2)),
    check(r.top, toBe(3)),
    check(r.right, toBe(6)),
    check(r.bottom, toBe(8)),
    check(
      z.x + z.y + z.width + z.height,
      toBe(0),
    ),
  ]);
});

test("getBoundingClientRect is a zero rect by default", () => {
  const el = makeElement("div");
  return check(
    el.getBoundingClientRect().width,
    toBe(0),
  );
});

test("focus sets activeElement; resetFocus clears it", () => {
  const el = makeElement("input");
  el.focus();
  const a1 = check(
    activeElement() === el,
    toBe(true),
  );
  resetFocus();
  return all([
    a1,
    check(activeElement() === null, toBe(true)),
  ]);
});

// --- selector engine ---------------------------------------------------

test("querySelector matches tag, class, attribute and descendant", () => {
  const root = makeElement("div");
  const ul = makeElement("ul");
  ul.setAttribute("class", "todo-filters");
  const b1 = makeElement("button");
  b1.setAttribute("class", "filter selected");
  const b2 = makeElement("button");
  b2.setAttribute("class", "filter");
  const input = makeElement("input");
  input.setAttribute("name", "title");
  input.setAttribute("type", "text");
  ul.appendChild(b1);
  ul.appendChild(b2);
  root.appendChild(ul);
  root.appendChild(input);
  const q = kids(root);
  return all([
    check(
      root.querySelector("button") === b1,
      toBe(true),
    ),
    check(q("button").length, toBe(2)),
    check(
      queryOne(
        root,
        ".todo-filters button.filter.selected",
        (n) => n.elementChildren(),
      ) === b1,
      toBe(true),
    ),
    check(
      root.querySelector("input[name=title]") ===
        input,
      toBe(true),
    ),
    check(
      root.querySelector(
        'input[name="title"]',
      ) === input,
      toBe(true),
    ),
    check(
      root.querySelector("[type=text]") === input,
      toBe(true),
    ),
    check(
      root.querySelector("span") === null,
      toBe(true),
    ),
    check(q("").length, toBe(0)),
  ]);
});

// --- window / history / location / document ----------------------------

test("history push/replace update the location", () => {
  const { window } = makeDom();
  const a1 = check(
    window.location.pathname,
    toBe("/"),
  );
  window.history.pushState(null, "", "/users/1");
  const a2 = check(
    window.location.pathname,
    toBe("/users/1"),
  );
  window.history.replaceState(null, "", "/?n=1");
  return all([
    a1,
    a2,
    check(window.location.search, toBe("?n=1")),
    check(
      window.location.origin,
      toBe("http://localhost"),
    ),
  ]);
});

test("getComputedStyle reads inline position, else static", () => {
  const { window } = makeDom();
  const el = makeElement("div");
  const a1 = check(
    window.getComputedStyle(el).position,
    toBe("static"),
  );
  el.style.position = "absolute";
  return all([
    a1,
    check(
      window.getComputedStyle(el).position,
      toBe("absolute"),
    ),
  ]);
});

test("document creates nodes and finds by id", () => {
  const { document } = makeDom();
  const el = document.createElement("section");
  el.setAttribute("id", "main");
  document.body.appendChild(el);
  const txt = document.createTextNode("t");
  return all([
    check(el.tagName, toBe("SECTION")),
    check(txt.data, toBe("t")),
    check(
      document.getElementById("main") === el,
      toBe(true),
    ),
    check(
      document.getElementById("nope") === null,
      toBe(true),
    ),
    check(document.head.tagName, toBe("HEAD")),
  ]);
});

test("window dispatches popstate to its own listeners", () => {
  const { window } = makeDom();
  let hits = 0;
  window.addEventListener("popstate", () => {
    hits = hits + 1;
  });
  window.dispatchEvent(new Event("popstate"));
  return check(hits, toBe(1));
});

test("bubblePath of a detached node stops at its root", () => {
  const root = makeElement("div");
  const child = makeElement("span");
  root.appendChild(child);
  return check(bubblePath(child).length, toBe(2));
});

// --- install / teardown / instanceof brands ----------------------------

test("installDom adds the globals and the teardown removes them", async () => {
  const restore = await installDom();
  const installed =
    "document" in globalThis &&
    "window" in globalThis &&
    "self" in globalThis &&
    "top" in globalThis &&
    "HTMLInputElement" in globalThis;
  await restore();
  const cleaned =
    !("document" in globalThis) &&
    !("window" in globalThis) &&
    !("self" in globalThis) &&
    !("top" in globalThis);
  return all([
    check(installed, toBe(true)),
    check(cleaned, toBe(true)),
  ]);
});

test("element and text instanceof brands classify nodes", () => {
  const el = makeElement("input");
  const txt = makeText("x");
  const anyEl = elementBrand();
  const inputBrand = elementBrand("INPUT");
  const liBrand = elementBrand("LI");
  return all([
    check(el instanceof anyEl, toBe(true)),
    check(el instanceof inputBrand, toBe(true)),
    check(el instanceof liBrand, toBe(false)),
    check(txt instanceof textBrand, toBe(true)),
    check(el instanceof textBrand, toBe(false)),
  ]);
});

test("brands reject non-nodes without throwing", () => {
  const anyEl = elementBrand();
  return all([
    check(
      anyEl[Symbol.hasInstance](5),
      toBe(false),
    ),
    check(
      anyEl[Symbol.hasInstance](null),
      toBe(false),
    ),
    check(
      textBrand[Symbol.hasInstance]("s"),
      toBe(false),
    ),
    check(
      anyEl[Symbol.hasInstance]({ nodeType: 9 }),
      toBe(false),
    ),
  ]);
});

// `toEqual` exercise keeps the import meaningful for structural checks.
test("DOMRect is structurally a full rect", () =>
  check(
    DomRectCtor(0, 0, 0, 0),
    toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  ));
