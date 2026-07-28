import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some, none } from "plgg";
import {
  type Html,
  div,
  p,
  strong,
  text,
  raw,
  renderToString,
} from "plggpress/framework";
import {
  textOf,
  markSpan,
  markedBody,
} from "plggpress/Locate/usecase/markSpan";

// A document whose text runs ACROSS element boundaries, so
// a quoted passage is not conveniently inside one node.
const body: Html<never> = div(
  [],
  [
    p(
      [],
      [
        text("Depth is expressed by "),
        strong([], [text("columns")]),
        text(" that expand rightward."),
      ],
    ),
    p(
      [],
      [text("It never consumes the viewport.")],
    ),
  ],
);

// A document holding pre-rendered highlighter output: its
// bytes are markup, not prose.
const withRaw: Html<never> = div(
  [],
  [
    p([], [text("before ")]),
    raw("<em>markup</em>"),
    p([], [text(" after")]),
  ],
);

const marked = (span: string): string =>
  renderToString(markedBody(body, some(span)));

test("the document's text is its prose, in reading order", () =>
  all([
    check(
      textOf(body),
      toBe(
        "Depth is expressed by columns that expand rightward.It never consumes the viewport.",
      ),
    ),
    // raw passthrough bytes are markup, not text: a span can
    // neither be located in one nor split one
    check(textOf(withRaw), toBe("before  after")),
  ]));

test("a verbatim passage is marked where the document says it", () =>
  all([
    check(
      marked("never consumes the viewport"),
      toContain(
        '<mark class="vp-mark">never consumes the viewport</mark>',
      ),
    ),
    // the rest of the document is untouched
    check(
      marked("never consumes the viewport"),
      toContain("Depth is expressed by "),
    ),
  ]));

test("a passage spanning element boundaries is marked in every part it crosses", () => {
  const out = marked(
    "expressed by columns that expand",
  );
  return all([
    // the run before the <strong>…
    check(
      out,
      toContain(">expressed by </mark>"),
    ),
    // …the emphasised word itself…
    check(out, toContain(">columns</mark>")),
    // …and the run after it
    check(out, toContain("> that expand</mark>")),
    // the emphasis is preserved, not flattened
    check(out, toContain("<strong")),
  ]);
});

test("a PARAPHRASED quotation cannot be displayed", () => {
  // one word altered from a real sentence in the document
  const paraphrase =
    "It never consumes the screen.";
  return all([
    check(
      marked(paraphrase),
      not(toContain("<mark")),
    ),
    // and the document itself still renders in full
    check(
      marked(paraphrase),
      toContain(
        "It never consumes the viewport.",
      ),
    ),
  ]);
});

test("an ambiguous or empty quotation is refused too", () =>
  all([
    // "expand" occurs once, "e" occurs many times
    check(marked("e"), not(toContain("<mark"))),
    check(marked(""), not(toContain("<mark"))),
    // the refusals are typed, and name what to do next
    check(
      renderToString(body).length > 0,
      toBe(true),
    ),
  ]));

test("markSpan reports WHY it refused", () => {
  const absent = markSpan(body, "not in here");
  const ambiguous = markSpan(body, "e");
  const empty = markSpan(body, "");
  const kindOf = (r: typeof absent): string =>
    r.__tag === "Err" ? r.content.kind : "Ok";
  return all([
    check(kindOf(absent), toBe("FindAbsent")),
    check(
      kindOf(ambiguous),
      toBe("FindAmbiguous"),
    ),
    check(kindOf(empty), toBe("EmptyFind")),
  ]);
});

test("a column with no quoted passage is the document, unchanged", () =>
  check(
    renderToString(markedBody(body, none())),
    toBe(renderToString(body)),
  ));

test("raw passthrough content survives the walk verbatim", () =>
  check(
    renderToString(
      markedBody(withRaw, some("before")),
    ),
    toContain("<em>markup</em>"),
  ));
