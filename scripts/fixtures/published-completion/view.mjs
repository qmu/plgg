// Runs inside Chromium against installed registry exports, never workspace source.
export async function inspectView() {
  const view = await import("plgg-view");
  const client = await import("plgg-view/client");
  const results = [];
  const check = (id, run) => {
    const root = document.createElement("div");
    document.body.append(root);
    try {
      run(root);
      results.push({ id, status: "passed" });
    } catch {
      results.push({ id, status: "failed" });
    } finally {
      root.remove();
    }
  };
  const require = (condition) => {
    if (!condition) throw Error("probe failed");
  };
  check("svg-elements", (root) => {
    const tags = [
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "g",
      "path",
    ];
    const render = client.makeRenderer(
      root,
      () => {},
    );
    render(
      view.el(
        "svg",
        [view.attr("viewBox", "0 0 24 24")],
        tags.map((tag) => view.el(tag, [], [])),
      ),
    );
    require(
      root.querySelectorAll("svg > *").length ===
        tags.length,
    );
    for (const tag of tags) {
      require(
        root.querySelector(tag)?.namespaceURI ===
          "http://www.w3.org/2000/svg",
      );
    }
  });
  check("raw-identity", (root) => {
    const render = client.makeRenderer(
      root,
      () => {},
    );
    const tree = () =>
      view.el(
        "div",
        [view.attr("class", "row")],
        [
          view.raw(
            '<svg viewBox="0 0 24 24"><rect width="7" height="9"/></svg>',
          ),
        ],
      );
    render(tree());
    const svg = root.querySelector(".row > svg");
    require(svg !== null);
    render(tree());
    require(
      root.querySelector(".row > svg") === svg,
    );
  });
  check("frame-dispatch", (root) => {
    const pending = new Map();
    let nextId = 0;
    const oldRequest =
      window.requestAnimationFrame;
    const oldCancel = window.cancelAnimationFrame;
    window.requestAnimationFrame = (fn) => {
      pending.set(++nextId, fn);
      return nextId;
    };
    window.cancelAnimationFrame = (id) =>
      pending.delete(id);
    let paints = 0;
    let updates = 0;
    let stop = () => {};
    try {
      stop = client.application({
        render: "frame",
        init: () => [0, client.cmdNone()],
        update: (_msg, model) => {
          updates++;
          return [model + 1, client.cmdNone()];
        },
        view: (model) => {
          paints++;
          return view.el(
            "button",
            [view.onClick("increment")],
            [view.text(String(model))],
          );
        },
        onUrlChange: () => "increment",
      })(root);
      require(paints === 1);
      for (let i = 0; i < 5; i++)
        root.querySelector("button").click();
      require(
        updates === 5 &&
          paints === 1 &&
          pending.size === 1,
      );
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((fn) => fn(0));
      require(
        paints === 2 && root.textContent === "5",
      );
      root.querySelector("button").click();
      require(pending.size === 1);
      stop();
      require(pending.size === 0);
    } finally {
      stop();
      window.requestAnimationFrame = oldRequest;
      window.cancelAnimationFrame = oldCancel;
    }
  });
  check("lazy-subtree", (root) => {
    require(typeof view.lazy === "function");
    let calls = 0;
    const column = (model) => {
      calls++;
      return view.el(
        "span",
        [],
        [view.text(model.label)],
      );
    };
    const model = { label: "first" };
    const tree = (arg) =>
      view.el(
        "div",
        [],
        [view.lazy(column, arg)],
      );
    const render = client.makeRenderer(
      root,
      () => {},
    );
    render(tree(model));
    const node = root.querySelector("span");
    require(node !== null && calls > 0);
    const baseline = calls;
    const observer = new MutationObserver(
      () => {},
    );
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    try {
      render(tree(model));
      require(
        calls === baseline &&
          root.querySelector("span") === node &&
          observer.takeRecords().length === 0,
      );
      render(tree({ label: "second" }));
      require(
        calls > baseline &&
          root.textContent === "second",
      );
    } finally {
      observer.disconnect();
    }
  });
  return results;
}
