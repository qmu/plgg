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
  selectNodes,
  type Flow,
  type Change,
} from "plgg-flow";
import {
  printLines,
  printSpec,
  joinLine,
  selectSubject,
  subjectSelected,
  type Rule,
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
) => {
  const panel = anchor.closest(".dsl"),
    host = panel?.querySelector(".dsl-overlay");
  if (!(host instanceof HTMLElement) || !panel)
    return;
  host.replaceChildren(control);
  const bounds = panel.getBoundingClientRect();
  const box = anchor.getBoundingClientRect();
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
        box.top - bounds.top - panel.clientTop,
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
  apply: (v: string) => void,
  selectText = true,
) => {
  const input = document.createElement("input");
  input.className = "dsl-field";
  input.setAttribute(
    "aria-label",
    "DSL の行を編集",
  );
  input.value = value;
  const close = overlay(anchor, input);
  if (!close) return;
  input.addEventListener("keydown", (e) => {
    if (
      !e.isComposing &&
      (e.key === "Enter" ||
        (e.key === "Backspace" && !input.value))
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
          (v, i) => v !== lines[i]?.text,
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
        (v) =>
          commit(
            anchor,
            v ? replace(v) : remove(),
          ),
        initial === value,
      );
    const edge =
      subject?.kind === "edge"
        ? flow.edges[subject.index]
        : undefined;
    const chosen =
      (flow.selectedDslRow?.index === i &&
        flow.selectedDslRow.text === value) ||
      (subject &&
        (subjectSelected(subject, flow) ||
          (edge &&
            (implicit.has(edge.source) ||
              implicit.has(edge.target)))));
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
          }
          return some(
            select(
              subject &&
                subject.kind !== "directive"
                ? selectSubject(
                    subject,
                    "shiftKey" in e &&
                      e.shiftKey === true,
                  )
                : (f) => ({
                    ...selectNodes([])(f),
                    selectedDslRow: {
                      index: i,
                      text: value,
                    },
                  }),
            ),
          );
        }),
        effect("dblclick", (_, a) => edit(a)),
        onEvent<never>("keydown", (e) => {
          if (
            !(e instanceof KeyboardEvent) ||
            !(
              e.currentTarget instanceof
              HTMLElement
            ) ||
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
      [text(value)],
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
