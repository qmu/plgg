import { some, none } from "plgg";
import {
  attr,
  el,
  text,
  onEvent,
  type Html,
} from "plgg-view";
import {
  deleteSelected,
  selectedNodes,
  type Flow,
  type Change,
} from "plgg-flow";
import {
  printLines,
  snapToken,
  printSpec,
  joinLine,
  selectSubject,
  subjectSelected,
  type Rule,
  type Token,
  type Line,
} from "plgg-flow/dsl";

const commit = (
  anchor: HTMLElement,
  value: string,
) =>
  anchor.dispatchEvent(
    new InputEvent("dsl-commit", {
      data: value,
      bubbles: true,
    }),
  );
const effect = (
  event: string,
  fn: (event: Event, target: HTMLElement) => void,
) =>
  onEvent<never>(event, (e) => {
    if (e.currentTarget instanceof HTMLElement)
      fn(e, e.currentTarget);
    return none();
  });
// The panel owns a single transient control. Position in its containing
// block so scrolling the page keeps the control with the sheet.
const overlay = (
  anchor: HTMLElement,
  control: HTMLElement,
  menu: boolean,
) => {
  const panel = anchor.closest(".dsl"),
    host = panel?.querySelector(".dsl-overlay");
  if (!(host instanceof HTMLElement) || !panel)
    return;
  host.replaceChildren(control);
  const list = anchor.closest(".dsl-rows");
  const bounds = panel.getBoundingClientRect();
  control.style.maxWidth =
    panel.clientWidth + "px";
  if (menu && list instanceof HTMLElement) {
    // Reserve just enough scroll range below the last token for its menu.
    const height = Math.min(
      control.offsetHeight,
      Math.max(
        1,
        list.clientHeight - anchor.offsetHeight,
      ),
    );
    control.style.maxHeight = height + "px";
    list.style.setProperty(
      "--choice-height",
      height + "px",
    );
    const overflow =
      anchor.getBoundingClientRect().bottom +
      height -
      list.getBoundingClientRect().bottom;
    if (overflow > 0) list.scrollTop += overflow;
  }
  const box = anchor.getBoundingClientRect();
  if (!menu)
    control.style.width =
      Math.min(
        panel.clientWidth,
        Math.max(90, box.width),
      ) + "px";
  control.style.left =
    Math.max(
      0,
      Math.min(
        box.left - bounds.left - panel.clientLeft,
        panel.clientWidth - control.offsetWidth,
      ),
    ) + "px";
  control.style.top =
    Math.max(
      0,
      Math.min(
        panel.clientHeight - control.offsetHeight,
        (menu ? box.bottom : box.top) -
          bounds.top -
          panel.clientTop,
      ),
    ) + "px";
  const close = () => {
    control.remove();
    if (anchor.isConnected)
      anchor.focus({ preventScroll: true });
  };
  control.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
  control.addEventListener("focusout", (e) => {
    if (
      !(e.relatedTarget instanceof Node) ||
      !control.contains(e.relatedTarget)
    )
      control.remove();
  });
  return close;
};
const field = (
  anchor: HTMLElement,
  value: string,
  label: string,
  apply: (v: string) => void,
  emptyDelete = false,
  selectText = true,
) => {
  const input = document.createElement("input");
  input.className = "dsl-field";
  input.setAttribute("aria-label", label);
  input.value = value;
  const close = overlay(anchor, input, false);
  if (!close) return;
  input.addEventListener("keydown", (e) => {
    if (
      !e.isComposing &&
      (e.key === "Enter" ||
        (emptyDelete &&
          e.key === "Backspace" &&
          !input.value))
    ) {
      e.preventDefault();
      close();
      apply(input.value);
    }
  });
  input.focus();
  if (selectText) input.select();
  else
    input.setSelectionRange(
      value.length,
      value.length,
    );
};
const choices = (
  anchor: HTMLElement,
  values: readonly string[],
  apply: (v: string) => void,
) => {
  const menu = document.createElement("div");
  menu.className = "dsl-menu";
  const close = () => {
    menu.remove();
    anchor.focus({ preventScroll: true });
  };
  for (const v of values) {
    const option =
      document.createElement("button");
    option.type = "button";
    option.textContent = v || "なし";
    option.setAttribute(
      "aria-label",
      (v || "なし") + " を選択",
    );
    option.onclick = () => {
      close();
      apply(v);
    };
    menu.append(option);
  }
  overlay(anchor, menu, true);
  menu.querySelector("button")?.focus();
};
// Preview against the original value throughout a gesture and commit once,
// so a drag occupies a single undo entry.
const scrubNumber = (
  initial: string,
  snap: number | undefined,
  apply: (
    anchor: HTMLElement,
    value: string,
  ) => void,
) =>
  effect("pointerdown", (e, anchor) => {
    if (
      !(e instanceof PointerEvent) ||
      e.button !== 0 ||
      !e.isPrimary
    )
      return;
    anchor.setPointerCapture(e.pointerId);
    delete anchor.dataset.scrubbed;
    const gesture = new AbortController();
    const options = { signal: gesture.signal };
    const preview = (p: PointerEvent) => {
      if (p.pointerId !== e.pointerId)
        return initial;
      const delta = p.clientX - e.clientX;
      if (Math.abs(delta) >= 3)
        anchor.dataset.scrubbed = "true";
      const value = String(
        Number(initial) +
          Math.round(delta / 4) *
            (snap === 0 ? 1 : (snap ?? 16)) *
            (p.shiftKey ? 4 : 1),
      );
      if (anchor.dataset.scrubbed)
        anchor.textContent = value;
      return value;
    };
    const end = (p: PointerEvent) => {
      if (p.pointerId !== e.pointerId) return;
      gesture.abort();
      const value =
        p.type === "pointerup"
          ? preview(p)
          : initial;
      anchor.textContent = initial;
      if (
        anchor.dataset.scrubbed &&
        value !== initial
      )
        apply(anchor, value);
    };
    anchor.addEventListener(
      "pointermove",
      preview,
      options,
    );
    anchor.addEventListener(
      "pointerup",
      end,
      options,
    );
    anchor.addEventListener(
      "pointercancel",
      end,
      options,
    );
    anchor.addEventListener(
      "lostpointercapture",
      end,
      options,
    );
  });
const tokenView = <A>(
  t: Token,
  ghost: boolean,
  flow: Flow,
  rules: readonly Rule[],
): Html<A> => {
  const act = t.act;
  if (!act) return text(t.text);
  const apply = (
    anchor: HTMLElement,
    value: string,
  ) =>
    commit(
      anchor,
      printSpec(act.change(value)(flow), rules),
    );
  const activate = (anchor: HTMLElement) => {
    if (act.kind === "toggle")
      apply(anchor, act.value);
    else if (act.kind === "choice")
      choices(anchor, act.choices ?? [], (v) =>
        apply(anchor, v),
      );
    else
      field(anchor, act.value, act.label, (v) =>
        apply(anchor, v),
      );
  };
  return el<A>(
    "button",
    [
      attr("type", "button"),
      attr("aria-label", act.label),
      attr(
        "class",
        ghost ? "dsl-token ghost" : "dsl-token",
      ),
      effect("click", (e, anchor) => {
        e.stopPropagation();
        if (anchor.dataset.scrubbed) {
          delete anchor.dataset.scrubbed;
          return;
        }
        activate(anchor);
      }),
      ...(act.kind === "number"
        ? [
            scrubNumber(
              act.value,
              flow.snap,
              apply,
            ),
          ]
        : []),
    ],
    [text(t.text)],
  );
};
export const replaceRow = (
  lines: readonly string[],
  index: number,
  value: string,
) =>
  [
    ...lines.slice(0, index),
    ...(value ? [value] : []),
    ...lines.slice(index + 1),
  ].join("\n");

export const dslRows = <A>(
  flow: Flow,
  rules: readonly Rule[],
  source: string,
  error: string | undefined,
  select: (fn: Change) => A,
  retype: (v: string) => A,
) => {
  const lines = printLines(flow, rules);
  const printed = error
    ? source.split("\n")
    : lines.map(joinLine);
  const invalid = error
    ? Number.parseInt(error) ||
      1 +
        printed.findIndex(
          (v, i) =>
            v !==
            lines[i]?.tokens
              .map((t) => t.text)
              .join(" "),
        )
    : 0;
  const declared = new Set(
    lines.flatMap((l) =>
      l.subject.kind === "node"
        ? [l.subject.id]
        : [],
    ),
  );
  const implicit = new Set(
    selectedNodes(flow).filter(
      (id) => !declared.has(id),
    ),
  );
  const row = (
    value: string,
    i: number,
    line?: Line,
  ): Html<A> => {
    const subject = line?.subject;
    const replace = (value: string) =>
      replaceRow(printed, i, value);
    const remove = () =>
      subject?.kind === "node"
        ? printSpec(
            deleteSelected(
              selectSubject(subject, false)(flow),
            ),
            rules,
          )
        : replace("");
    const edit = (
      anchor: HTMLElement,
      initial = value,
    ) =>
      field(
        anchor,
        initial,
        "DSL の行を編集",
        (v) =>
          commit(
            anchor,
            v ? replace(v) : remove(),
          ),
        true,
        initial === value,
      );
    const edge =
      subject?.kind === "edge"
        ? flow.edges[subject.index]
        : undefined;
    const chosen =
      subject &&
      (subjectSelected(subject, flow) ||
        (edge &&
          (implicit.has(edge.source) ||
            implicit.has(edge.target))));
    return el<A>(
      "div",
      [
        attr("class", "dsl-row"),
        attr("role", "option"),
        attr("tabindex", "0"),
        attr("aria-label", value || "行を追加"),
        attr("aria-selected", String(!!chosen)),
        ...(invalid === i + 1
          ? [attr("aria-invalid", "true")]
          : []),
        onEvent("click", (e) => {
          if (
            !value &&
            e.currentTarget instanceof HTMLElement
          ) {
            edit(e.currentTarget);
            return none();
          }
          return subject &&
            e instanceof MouseEvent
            ? some(
                select(
                  selectSubject(
                    subject,
                    e.shiftKey,
                  ),
                ),
              )
            : none();
        }),
        effect("dblclick", (e, a) => {
          if (
            !(
              e.target instanceof Element &&
              e.target.closest("button")
            )
          )
            edit(a);
        }),
        onEvent<never>("keydown", (e) => {
          if (
            !(e instanceof KeyboardEvent) ||
            !(
              e.currentTarget instanceof
              HTMLElement
            ) ||
            (e.target !== e.currentTarget &&
              ![
                "ArrowUp",
                "ArrowDown",
                "F2",
              ].includes(e.key)) ||
            e.isComposing
          )
            return none();
          const a = e.currentTarget;
          if (
            e.key === "ArrowDown" ||
            e.key === "ArrowUp"
          ) {
            const next =
              e.key === "ArrowDown"
                ? a.nextElementSibling
                : a.previousElementSibling;
            if (next instanceof HTMLElement) {
              e.preventDefault();
              next.focus();
              if (next.nextElementSibling)
                next.click();
            }
          } else if (
            e.key === "Backspace" &&
            !value &&
            i < printed.length
          ) {
            e.preventDefault();
            commit(a, remove());
          } else if (
            e.key === "Enter" ||
            e.key === "F2" ||
            (!value &&
              e.key.length === 1 &&
              !e.ctrlKey &&
              !e.metaKey)
          ) {
            e.preventDefault();
            edit(
              a,
              e.key.length === 1 ? e.key : value,
            );
          }
          return none();
        }),
        ...(!subject ||
        subject.kind === "directive"
          ? []
          : [
              effect("pointerenter", (_, a) => {
                const selector =
                  subject.kind === "node"
                    ? '[data-node="' +
                      CSS.escape(subject.id) +
                      '"]'
                    : '[data-edge-index="' +
                      subject.index +
                      '"]';
                a
                  .closest(".stage")
                  ?.querySelectorAll(selector)
                  .forEach((n) =>
                    n.classList.add("dsl-hover"),
                  );
              }),
              effect("pointerleave", (_, a) =>
                a
                  .closest(".stage")
                  ?.querySelectorAll(".dsl-hover")
                  .forEach((n) =>
                    n.classList.remove(
                      "dsl-hover",
                    ),
                  ),
              ),
            ]),
      ],
      [
        ...(line
          ? line.tokens.flatMap((t, j) => [
              ...(j ? [text(" ")] : []),
              tokenView<A>(t, false, flow, rules),
            ])
          : [text(value)]),
        ...(!line &&
        !error &&
        i === printed.length &&
        !lines.some(
          (l) =>
            l.subject.kind === "directive" &&
            l.subject.name === "snap",
        )
          ? [
              tokenView<A>(
                snapToken(flow.snap, true),
                true,
                flow,
                rules,
              ),
            ]
          : []),
        ...(line?.ghosts ?? []).map((t) =>
          tokenView<A>(t, true, flow, rules),
        ),
        ...(i < printed.length
          ? [
              el<A>(
                "button",
                [
                  attr("type", "button"),
                  attr("class", "dsl-delete"),
                  attr("aria-label", "行を削除"),
                  effect("click", (e, a) => {
                    e.stopPropagation();
                    commit(a, remove());
                  }),
                ],
                [text("×")],
              ),
            ]
          : []),
      ],
    );
  };
  return el<A>(
    "div",
    [
      attr("class", "dsl-rows"),
      attr("role", "listbox"),
      attr("aria-label", "図の DSL"),
      attr("aria-multiselectable", "true"),
      onEvent("dsl-commit", (e) =>
        e instanceof InputEvent && e.data !== null
          ? some(retype(e.data))
          : none(),
      ),
    ],
    [
      ...printed.map((v, i) =>
        row(v, i, error ? undefined : lines[i]),
      ),
      row("", printed.length),
    ],
  );
};

// Keep the page and board still while revealing a selection inside the list.
export const revealSelection = (
  root: Element,
) => {
  const reveal = () => {
    const row = root.querySelector(
        '.dsl-row[aria-selected="true"]',
      ),
      list = row?.parentElement;
    if (!row || !list || !list.clientHeight)
      return;
    const r = row.getBoundingClientRect(),
      b = list.getBoundingClientRect();
    if (r.top < b.top)
      list.scrollTop += r.top - b.top;
    else if (r.bottom > b.bottom)
      list.scrollTop += r.bottom - b.bottom;
  };
  const observer = new MutationObserver(reveal);
  const dismiss = (e: PointerEvent) => {
    const host = root.querySelector(
      ".dsl-overlay",
    );
    if (
      host?.firstElementChild &&
      e.target instanceof Node &&
      !host.contains(e.target)
    )
      host.replaceChildren();
  };
  document.addEventListener(
    "pointerdown",
    dismiss,
    true,
  );
  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-selected"],
  });
  reveal();
  return () => {
    observer.disconnect();
    document.removeEventListener(
      "pointerdown",
      dismiss,
      true,
    );
  };
};
