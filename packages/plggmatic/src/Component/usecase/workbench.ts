import {
  type SoftStr,
  type Option,
  isSome,
  matchOption,
} from "plgg";
import {
  type Html,
  el,
  text,
  attr,
  onClick,
  onInput,
} from "plgg-view";
import {
  codeInputClass,
  rowsClass,
  rowsRowClass,
  splitterClass,
  statusClass,
} from "plggmatic/Meta/model/classHooks";

/**
 * A SPLITTER: the boundary between two panes, which a
 * reader drags to give one what it takes from the other.
 * `vertical` stands between a left and a right pane,
 * `horizontal` between an upper and a lower one. It is a
 * real separator, named for what it sizes; moving the
 * panes is the host's — the splitter is where the
 * pointer takes hold.
 */
export type SplitterProps = Readonly<{
  label: SoftStr;
  orientation: "vertical" | "horizontal";
}>;
export const splitter = <Msg>(
  props: SplitterProps,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", splitterClass),
      attr("role", "separator"),
      attr("aria-orientation", props.orientation),
      attr("aria-label", props.label),
    ],
    [],
  );

/**
 * A ROW LIST: rows of text, one of them chosen — the
 * lines of a source, the entries of a log. Each row is
 * an option of one list, so which is chosen is spoken;
 * a row that is wrong says so too.
 */
export type TextRow = Readonly<{
  id: SoftStr;
  text: SoftStr;
  invalid: boolean;
}>;
export type RowListProps<Msg> = Readonly<{
  label: SoftStr;
  rows: ReadonlyArray<TextRow>;
  selected: Option<SoftStr>;
  onSelect: (id: SoftStr) => Msg;
}>;
export const rowList = <Msg>(
  props: RowListProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", rowsClass),
      attr("role", "listbox"),
      attr("aria-label", props.label),
    ],
    props.rows.map((row: TextRow) =>
      el(
        "div",
        [
          attr("class", rowsRowClass),
          attr("role", "option"),
          attr("tabindex", "0"),
          attr(
            "aria-selected",
            matchOption<SoftStr, boolean>(
              () => false,
              (id: SoftStr) => id === row.id,
            )(props.selected)
              ? "true"
              : "false",
          ),
          ...(row.invalid
            ? [attr("aria-invalid", "true")]
            : []),
          onClick(props.onSelect(row.id)),
        ],
        [text(row.text)],
      ),
    ),
  );

/**
 * A CODE INPUT: a field for source text — fixed-pitch,
 * never wrapped, never spell-checked. Its label is
 * spoken, not drawn: the panel it stands in says what it
 * is.
 */
export type CodeInputProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  value: SoftStr;
  onInput: (value: SoftStr) => Msg;
}>;
export const codeInput = <Msg>(
  props: CodeInputProps<Msg>,
): Html<Msg> =>
  el(
    "textarea",
    [
      attr("class", codeInputClass),
      attr("name", props.name),
      attr("aria-label", props.label),
      attr("spellcheck", "false"),
      attr("value", props.value),
      onInput(props.onInput),
    ],
    [text(props.value)],
  );

/**
 * A STATUS LINE: the one line a working surface says its
 * state on, announced when it changes. A line that
 * reports a failure is marked, and is drawn so it cannot
 * be missed.
 */
export type StatusLineProps = Readonly<{
  text: SoftStr;
  tone: Option<"danger">;
}>;
export const statusLine = <Msg>(
  props: StatusLineProps,
): Html<Msg> =>
  el(
    "output",
    [
      attr("class", statusClass),
      attr("aria-live", "polite"),
      ...(isSome(props.tone)
        ? [attr("data-error", "")]
        : []),
    ],
    [text(props.text)],
  );
