import { test, expect } from "vitest";
import { some, none } from "plgg";
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
} from "plgg-view/Html/model/Attribute";

type Msg =
  | { kind: "Clicked" }
  | { kind: "Typed"; value: string };

test("attr builds a static name/value pair", () => {
  expect(attr("data-x", "1")).toEqual({
    __tag: "Attr",
    content: { name: "data-x", value: "1" },
  });
});

test("class_ and href are attr shortcuts", () => {
  expect(class_("done")).toEqual({
    __tag: "Attr",
    content: { name: "class", value: "done" },
  });
  expect(href("/a")).toEqual({
    __tag: "Attr",
    content: { name: "href", value: "/a" },
  });
});

test("onClick builds a click handler that ignores the payload", () => {
  const a = onClick<Msg>({ kind: "Clicked" });
  expect(a.__tag).toBe("Handler");
  if (a.__tag === "Handler") {
    expect(a.content.event).toBe("click");
    expect(a.content.toMsg("ignored")).toEqual({
      kind: "Clicked",
    });
  }
});

test("onInput builds an input handler that receives the value", () => {
  const a = onInput<Msg>((value) => ({
    kind: "Typed",
    value,
  }));
  if (a.__tag === "Handler") {
    expect(a.content.event).toBe("input");
    expect(a.content.toMsg("hi")).toEqual({
      kind: "Typed",
      value: "hi",
    });
  }
});

test("onSubmit builds a submit handler; on builds a raw handler", () => {
  expect(
    onSubmit<Msg>({ kind: "Clicked" }).__tag,
  ).toBe("Handler");
  const raw = on<Msg>("focus", () => ({
    kind: "Clicked",
  }));
  if (raw.__tag === "Handler") {
    expect(raw.content.event).toBe("focus");
  }
});

test("fadeIn builds an enter-only Anim directive", () => {
  expect(fadeIn(150)).toEqual({
    __tag: "Anim",
    content: {
      enter: some({
        from: {
          opacity: some(0),
          transform: none(),
        },
        to: {
          opacity: some(1),
          transform: none(),
        },
        durationMs: 150,
        easing: "ease-out",
      }),
      exit: none(),
    },
  });
});

test("fadeOut builds an exit-only Anim directive", () => {
  const a = fadeOut(120);
  expect(a.__tag).toBe("Anim");
  if (a.__tag === "Anim") {
    expect(a.content.enter).toEqual(none());
    expect(a.content.exit).toEqual(
      some({
        from: {
          opacity: some(1),
          transform: none(),
        },
        to: {
          opacity: some(0),
          transform: none(),
        },
        durationMs: 120,
        easing: "ease-in",
      }),
    );
  }
});

test("slideIn carries a transform on both endpoints", () => {
  const a = slideIn("12px", 200);
  if (a.__tag === "Anim") {
    expect(a.content.exit).toEqual(none());
    expect(a.content.enter).toEqual(
      some({
        from: {
          opacity: some(0),
          transform: some("translateY(12px)"),
        },
        to: {
          opacity: some(1),
          transform: some("translateY(0)"),
        },
        durationMs: 200,
        easing: "ease-out",
      }),
    );
  }
});

test("transition carries both directions when given", () => {
  const enter = {
    from: { opacity: some(0), transform: none() },
    to: { opacity: some(1), transform: none() },
    durationMs: 100,
    easing: "linear",
  };
  const a = transition({ enter, exit: enter });
  if (a.__tag === "Anim") {
    expect(a.content.enter).toEqual(some(enter));
    expect(a.content.exit).toEqual(some(enter));
  }
});
