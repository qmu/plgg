import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { some, none, box } from "plgg";
import {
  attr,
  on,
  onClick,
  onInput,
  onSubmit,
  class_,
  href,
  fadeIn,
  fadeOut,
  slideIn,
  transition,
  easeOut,
  easeIn,
  asSvgNumberList,
} from "plgg-view/Html/model/Attribute";

type Msg =
  | { kind: "Clicked" }
  | { kind: "Typed"; value: string };

test("attr builds a static name/value pair", () =>
  check(
    attr("data-x", "1"),
    toEqual({
      __tag: "Attr",
      content: { name: "data-x", value: "1" },
    }),
  ));

test("class_ and href are attr shortcuts", () =>
  all([
    check(
      class_("done"),
      toEqual({
        __tag: "Attr",
        content: {
          name: "class",
          value: "done",
        },
      }),
    ),
    check(
      href("/a"),
      toEqual({
        __tag: "Attr",
        content: { name: "href", value: "/a" },
      }),
    ),
  ]));

test("onClick builds a click handler that ignores the payload", () => {
  const a = onClick<Msg>({ kind: "Clicked" });
  return a.__tag === "Handler"
    ? all([
        check(a.content.event, toBe("click")),
        check(
          a.content.toMsg("ignored"),
          toEqual({ kind: "Clicked" }),
        ),
      ])
    : check(a.__tag, toBe("Handler"));
});

test("onInput builds an input handler that receives the value", () => {
  const a = onInput<Msg>((value) => ({
    kind: "Typed",
    value,
  }));
  return a.__tag === "Handler"
    ? all([
        check(a.content.event, toBe("input")),
        check(
          a.content.toMsg("hi"),
          toEqual({ kind: "Typed", value: "hi" }),
        ),
      ])
    : check(a.__tag, toBe("Handler"));
});

test("onSubmit builds a submit handler; on builds a raw handler", () => {
  const raw = on<Msg>("focus", () => ({
    kind: "Clicked",
  }));
  return all([
    check(
      onSubmit<Msg>({ kind: "Clicked" }).__tag,
      toBe("Handler"),
    ),
    raw.__tag === "Handler"
      ? check(raw.content.event, toBe("focus"))
      : check(raw.__tag, toBe("Handler")),
  ]);
});

test("fadeIn builds an enter-only Anim directive", () =>
  check(
    fadeIn(150),
    toEqual({
      __tag: "Anim",
      content: {
        enter: some({
          from: {
            opacity: some(box("Float")(0)),
            transform: none(),
          },
          to: {
            opacity: some(box("Float")(1)),
            transform: none(),
          },
          durationMs: 150,
          easing: easeOut,
        }),
        exit: none(),
      },
    }),
  ));

test("fadeOut builds an exit-only Anim directive", () => {
  const a = fadeOut(120);
  return a.__tag === "Anim"
    ? all([
        check(a.content.enter, toEqual(none())),
        check(
          a.content.exit,
          toEqual(
            some({
              from: {
                opacity: some(box("Float")(1)),
                transform: none(),
              },
              to: {
                opacity: some(box("Float")(0)),
                transform: none(),
              },
              durationMs: 120,
              easing: easeIn,
            }),
          ),
        ),
      ])
    : check(a.__tag, toBe("Anim"));
});

test("slideIn carries a transform on both endpoints", () => {
  const a = slideIn("12px", 200);
  return a.__tag === "Anim"
    ? all([
        check(a.content.exit, toEqual(none())),
        check(
          a.content.enter,
          toEqual(
            some({
              from: {
                opacity: some(box("Float")(0)),
                transform: some(
                  "translateY(12px)",
                ),
              },
              to: {
                opacity: some(box("Float")(1)),
                transform: some("translateY(0)"),
              },
              durationMs: 200,
              easing: easeOut,
            }),
          ),
        ),
      ])
    : check(a.__tag, toBe("Anim"));
});

test("asSvgNumberList joins finite numbers with a space", () =>
  check(
    asSvgNumberList([0, 0, 100, 100]),
    okThen(toBe("0 0 100 100")),
  ));

test("asSvgNumberList succeeds on an empty array", () =>
  check(asSvgNumberList([]), okThen(toBe(""))));

test("asSvgNumberList rejects NaN at its index", () =>
  check(
    asSvgNumberList([1, NaN, 3]),
    errThen((e) =>
      toContain("index 1")(e.content.message),
    ),
  ));

test("asSvgNumberList rejects Infinity", () =>
  check(
    asSvgNumberList([Infinity, 1]),
    errThen((e) =>
      toContain("index 0")(e.content.message),
    ),
  ));

test("asSvgNumberList preserves negative and fractional values", () =>
  check(
    asSvgNumberList([-1.5, 0, 2.25]),
    okThen(toBe("-1.5 0 2.25")),
  ));

test("transition carries both directions when given", () => {
  const enter = {
    from: {
      opacity: some(box("Float")(0)),
      transform: none(),
    },
    to: {
      opacity: some(box("Float")(1)),
      transform: none(),
    },
    durationMs: 100,
    easing: "linear",
  };
  const a = transition({ enter, exit: enter });
  return a.__tag === "Anim"
    ? all([
        check(
          a.content.enter,
          toEqual(some(enter)),
        ),
        check(
          a.content.exit,
          toEqual(some(enter)),
        ),
      ])
    : check(a.__tag, toBe("Anim"));
});

test("asSvgNumberList accepts readonly input without mutating it", () => {
  const values: ReadonlyArray<number> =
    Object.freeze([0, -0, 1e-7]);
  return all([
    check(
      asSvgNumberList(values),
      okThen(toBe("0 0 1e-7")),
    ),
    check(values, toEqual([0, -0, 1e-7])),
    check(
      asSvgNumberList([0, -Infinity]),
      errThen((e) =>
        toContain("index 1")(e.content.message),
      ),
    ),
  ]);
});
