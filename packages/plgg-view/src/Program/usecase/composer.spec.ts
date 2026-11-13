// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { some, none } from "plgg";
import {
  el,
  text,
  managedHost,
} from "plgg-view/Html/model/element";
import {
  attr,
  onEvent,
  onInput,
  fadeOut,
  key,
  type HostLifecycle,
} from "plgg-view/Html/model/Attribute";
import { mapHtml } from "plgg-view/Html/usecase/mapHtml";
import { renderToString } from "plgg-view/Html/usecase/renderToString";
import { makeRenderer } from "plgg-view/Program/usecase/render";

test("onEvent preserves events and dispatches none0/latest1/remove0/dispose0", () => {
  const root = document.createElement("div"),
    seen: Event[] = [],
    messages: string[] = [];
  document.body.appendChild(root);
  const render = makeRenderer<string>(root, (m) =>
      messages.push(m),
    ),
    event = new Event("input");
  render(
    el(
      "input",
      [
        onEvent("input", (e) => {
          seen.push(e);
          return none();
        }),
      ],
      [],
    ),
  );
  const input = root.firstElementChild;
  input?.dispatchEvent(event);
  const afterNone = messages.length;
  render(
    el(
      "input",
      [
        onEvent("input", (e) => {
          seen.push(e);
          return some("latest");
        }),
      ],
      [],
    ),
  );
  input?.dispatchEvent(event);
  const afterLatest = messages.length;
  render(el("input", [], []));
  input?.dispatchEvent(event);
  const afterRemove = messages.length;
  render(
    el(
      "input",
      [onEvent("input", () => some("fresh"))],
      [],
    ),
  );
  render.dispose();
  input?.dispatchEvent(event);
  root.remove();
  return all([
    check(
      [
        afterNone,
        afterLatest,
        afterRemove,
        messages.length,
      ],
      toEqual([0, 1, 1, 1]),
    ),
    check(messages, toEqual(["latest"])),
    check(seen.length, toBe(2)),
    check(seen[0], toBe(event)),
    check(seen[1], toBe(event)),
  ]);
});

test("onEvent maps messages, can prevent default, and coexists with legacy string handlers", () => {
  const root = document.createElement("div"),
    messages: string[] = [];
  const render = makeRenderer<string>(root, (m) =>
    messages.push(m),
  );
  render(
    mapHtml((n: number) => "mapped:" + n)(
      el(
        "input",
        [
          onEvent("input", (e) => {
            e.preventDefault();
            return some(7);
          }),
        ],
        [],
      ),
    ),
  );
  const event = new Event("input", {
    cancelable: true,
  });
  root.firstElementChild?.dispatchEvent(event);
  render(el("input", [onInput((v) => v)], []));
  const input = root.firstElementChild;
  if (input instanceof HTMLInputElement) {
    input.value = "draft";
    input.dispatchEvent(new Event("input"));
  }
  return all([
    check(
      messages,
      toEqual(["mapped:7", "draft"]),
    ),
    check(event.defaultPrevented, toBe(true)),
  ]);
});

test("managed hosts mount after insertion, keep foreign children through poll and reorder, and clean up once", () => {
  const root = document.createElement("div"),
    events: string[] = [];
  document.body.appendChild(root);
  const editors = new Map<string, Element>();
  const lifecycle = (
    id: string,
  ): HostLifecycle<string> => ({
    mount: (node, dispatch) => {
      events.push(
        "mount:" + id + ":" + root.contains(node),
      );
      const editor =
        document.createElement("input");
      editor.value = id + " draft";
      node.appendChild(editor);
      editors.set(id, editor);
      const listener = () => dispatch(id);
      editor.addEventListener("input", listener);
      return () => {
        events.push("cleanup:" + id);
        editor.removeEventListener(
          "input",
          listener,
        );
      };
    },
    update: (node) => {
      events.push("update:" + node.textContent);
    },
  });
  const messages: string[] = [];
  const render = makeRenderer<string>(root, (m) =>
    messages.push(m),
  );
  const view = (ids: ReadonlyArray<string>) =>
    el(
      "section",
      [],
      ids.map((id) =>
        managedHost(
          id,
          [attr("data-owner", id)],
          lifecycle(id),
        ),
      ),
    );
  render(view(["a", "b"]));
  const a = editors.get("a"),
    b = editors.get("b");
  if (b instanceof HTMLElement) b.focus();
  render(view(["a", "b"]));
  render(view(["b", "a"]));
  const section = root.firstElementChild;
  const first = section?.firstElementChild;
  const retained = first?.firstElementChild === b;
  const focus = document.activeElement === b;
  render(view(["b"]));
  a?.dispatchEvent(new Event("input"));
  b?.dispatchEvent(new Event("input"));
  render.dispose();
  render.dispose();
  b?.dispatchEvent(new Event("input"));
  root.remove();
  return all([
    check(retained, toBe(true)),
    check(focus, toBe(true)),
    check(
      events.filter((e) =>
        e.startsWith("mount:"),
      ),
      toEqual(["mount:a:true", "mount:b:true"]),
    ),
    check(
      events.filter((e) =>
        e.startsWith("cleanup:"),
      ),
      toEqual(["cleanup:a", "cleanup:b"]),
    ),
    check(messages, toEqual(["b"])),
  ]);
});

test("host key and tag changes dispose nested instances; normal children resume after ownership ends", () => {
  const root = document.createElement("div"),
    events: string[] = [];
  const render = makeRenderer<never>(
    root,
    () => undefined,
  );
  const life: HostLifecycle<never> = {
    mount: (node) => {
      node.appendChild(
        document.createTextNode("foreign"),
      );
      events.push("mount");
      return () => {
        events.push("cleanup");
      };
    },
    update: () => {
      events.push("update");
    },
  };
  render(
    el(
      "section",
      [],
      [managedHost("a", [], life)],
    ),
  );
  render(
    el(
      "section",
      [],
      [managedHost("b", [], life)],
    ),
  );
  render(
    el(
      "section",
      [],
      [el("div", [], [text("normal")])],
    ),
  );
  const normal = root.textContent;
  render(
    el(
      "section",
      [],
      [managedHost("c", [], life)],
    ),
  );
  render(text("replacement"));
  return all([
    check(normal, toBe("normal")),
    check(
      events.filter((e) => e === "mount").length,
      toBe(3),
    ),
    check(
      events.filter((e) => e === "cleanup")
        .length,
      toBe(3),
    ),
  ]);
});

test("SSR never runs host effects; mapped hosts dispatch mapped messages and preserve cleanup", () => {
  const events: string[] = [];
  let fire: () => void = () => undefined;
  const host = managedHost<number>(
    "editor",
    [attr("class", "editor")],
    {
      mount: (_node, dispatch) => {
        events.push("mount");
        fire = () => dispatch(3);
        return () => {
          events.push("cleanup");
        };
      },
      update: (_node, dispatch) => {
        fire = () => dispatch(4);
      },
    },
  );
  const mapped = mapHtml((n: number) => "n:" + n)(
    host,
  );
  const html = renderToString(mapped),
    before = events.length,
    root = document.createElement("div"),
    messages: string[] = [];
  const render = makeRenderer<string>(root, (m) =>
    messages.push(m),
  );
  render(mapped);
  fire();
  render(mapped);
  fire();
  render.dispose();
  return all([
    check(
      html,
      toBe('<div class="editor"></div>'),
    ),
    check(before, toBe(0)),
    check(messages, toEqual(["n:3", "n:4"])),
    check(events, toEqual(["mount", "cleanup"])),
  ]);
});

test("synchronous mount dispatch waits for the host commit before rendering and cleaning it", () => {
  const root = document.createElement("div"),
    events: string[] = [];
  const render: import("plgg-view/Program/usecase/render").Renderer<string> =
    makeRenderer<string>(root, (msg) =>
      render(text(msg)),
    );
  render(
    managedHost("editor", [], {
      mount: (_node, dispatch) => {
        events.push("mount");
        dispatch("done");
        return () => {
          events.push("cleanup");
        };
      },
      update: () => {
        events.push("update");
      },
    }),
  );
  render.dispose();
  return all([
    check(events, toEqual(["mount", "cleanup"])),
    check(root.childNodes.length, toBe(0)),
  ]);
});

test("logical exit cleans the host before animation and never cleans it twice after settlement", async () => {
  const root = document.createElement("div"),
    events: string[] = [];
  let finish: () => void = () => undefined;
  const play = () =>
    new Promise<void>((resolve) => {
      finish = resolve;
    });
  const render = makeRenderer<never>(
    root,
    () => undefined,
    play,
  );
  const host = managedHost<never>(
    "animated",
    [fadeOut(50)],
    {
      mount: () => () => {
        events.push("cleanup");
      },
      update: () => undefined,
    },
  );
  render(el("section", [], [host]));
  render(el("section", [], []));
  const before = events.length;
  render.dispose();
  finish();
  await Promise.resolve();
  return all([
    check(before, toBe(1)),
    check(events, toEqual(["cleanup"])),
  ]);
});

test("removing a submit handler restores the browser default", () => {
  const root = document.createElement("div"),
    render = makeRenderer<never>(
      root,
      () => undefined,
    );
  render(
    el(
      "form",
      [onEvent<never>("submit", () => none())],
      [],
    ),
  );
  const form = root.firstElementChild;
  render(el("form", [], []));
  const event = new Event("submit", {
    cancelable: true,
  });
  form?.dispatchEvent(event);
  return check(
    event.defaultPrevented,
    toBe(false),
  );
});

test("dispose is terminal and suppresses cleanup dispatch without mounting leaked hosts", () => {
  const root = document.createElement("div"),
    events: string[] = [];
  const render: import("plgg-view/Program/usecase/render").Renderer<string> =
    makeRenderer<string>(root, (msg) => {
      events.push("dispatch:" + msg);
      render(host);
    });
  const host = managedHost<string>("host", [], {
    mount: (_node, dispatch) => {
      events.push("mount");
      return () => {
        events.push("cleanup");
        dispatch("recreate");
        render(text("late"));
      };
    },
    update: () => undefined,
  });
  render(host);
  render.dispose();
  render.dispose();
  render(host);
  return all([
    check(events, toEqual(["mount", "cleanup"])),
    check(root.childNodes.length, toBe(0)),
  ]);
});

test("dispose requested from mount waits until its returned cleanup is installed", () => {
  const root = document.createElement("div"),
    events: string[] = [];
  const render: import("plgg-view/Program/usecase/render").Renderer<never> =
    makeRenderer<never>(root, () => undefined);
  render(
    managedHost("host", [], {
      mount: () => {
        events.push("mount");
        render.dispose();
        return () => {
          events.push("cleanup");
        };
      },
      update: () => undefined,
    }),
  );
  return all([
    check(events, toEqual(["mount", "cleanup"])),
    check(root.childNodes.length, toBe(0)),
  ]);
});

test("disposing on the first queued mount message suppresses the remaining snapshot", () => {
  const root = document.createElement("div"),
    messages: string[] = [],
    cleanup: string[] = [];
  const render: import("plgg-view/Program/usecase/render").Renderer<string> =
    makeRenderer<string>(root, (msg) => {
      messages.push(msg);
      if (msg === "first") render.dispose();
    });
  render(
    managedHost("host", [], {
      mount: (_node, dispatch) => {
        dispatch("first");
        dispatch("second");
        return () => {
          cleanup.push("cleanup");
        };
      },
      update: () => undefined,
    }),
  );
  return all([
    check(messages, toEqual(["first"])),
    check(cleanup, toEqual(["cleanup"])),
    check(root.childNodes.length, toBe(0)),
  ]);
});

test("focused keyed order keeps an unchanged predecessor before an exiting sibling", async () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const editor = document.createElement("input");
  let finish: () => void = () => undefined;
  const render = makeRenderer<never>(
    root,
    () => undefined,
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const a = el(
      "div",
      [key("a"), attr("data-node", "a")],
      [],
    ),
    x = el(
      "div",
      [
        key("x"),
        attr("data-node", "x"),
        fadeOut(50),
      ],
      [],
    );
  const b = managedHost<never>(
    "b",
    [attr("data-node", "b")],
    {
      mount: (node) => {
        node.appendChild(editor);
        return () => undefined;
      },
      update: () => undefined,
    },
  );
  render(el("section", [], [a, x, b]));
  editor.focus();
  render(el("section", [], [a, b]));
  const order = Array.from(
      root.firstElementChild?.children || [],
    ).map((n) => n.getAttribute("data-node")),
    focused = document.activeElement === editor;
  finish();
  await Promise.resolve();
  const settled = Array.from(
    root.firstElementChild?.children || [],
  ).map((n) => n.getAttribute("data-node"));
  render.dispose();
  root.remove();
  return all([
    check(order, toEqual(["a", "x", "b"])),
    check(focused, toBe(true)),
    check(settled, toEqual(["a", "b"])),
  ]);
});

test("focused keyed order keeps an exiting sibling before unchanged successors", async () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const editor = document.createElement("input");
  let finish: () => void = () => undefined;
  const render = makeRenderer<never>(
    root,
    () => undefined,
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const a = el(
      "div",
      [key("a"), attr("data-node", "a")],
      [],
    ),
    c = el(
      "div",
      [key("c"), attr("data-node", "c")],
      [],
    ),
    x = el(
      "div",
      [
        key("x"),
        attr("data-node", "x"),
        fadeOut(50),
      ],
      [],
    );
  const b = managedHost<never>(
    "b",
    [attr("data-node", "b")],
    {
      mount: (node) => {
        node.appendChild(editor);
        return () => undefined;
      },
      update: () => undefined,
    },
  );
  render(el("section", [], [b, x, a, c]));
  editor.focus();
  render(el("section", [], [b, a, c]));
  const order = Array.from(
      root.firstElementChild?.children || [],
    ).map((n) => n.getAttribute("data-node")),
    focused = document.activeElement === editor;
  finish();
  await Promise.resolve();
  const settled = Array.from(
    root.firstElementChild?.children || [],
  ).map((n) => n.getAttribute("data-node"));
  render.dispose();
  root.remove();
  return all([
    check(order, toEqual(["b", "x", "a", "c"])),
    check(focused, toBe(true)),
    check(settled, toEqual(["b", "a", "c"])),
  ]);
});
