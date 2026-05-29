import { test, expect } from "vitest";
import {
  attr,
  on,
  onClick,
  onInput,
  onSubmit,
  class_,
  href,
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
