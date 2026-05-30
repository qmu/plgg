import { test, expect } from "vitest";
import {
  text,
  button,
} from "plgg-view/Html/model/element";
import {
  onClick,
  class_,
} from "plgg-view/Html/model/Attribute";
import { mapHtml } from "plgg-view/Html/usecase/mapHtml";

test("mapHtml re-tags handler messages and preserves structure", () => {
  const child = button(
    [onClick<number>(1), class_("inc")],
    [text("+")],
  );
  const wrapped = mapHtml(
    (n: number): string => `child:${n}`,
  )(child);

  expect(wrapped.__tag).toBe("Element");
  if (wrapped.__tag === "Element") {
    const [handler, staticAttr] =
      wrapped.content.attributes;
    // the click handler's Msg is now a string
    if (handler && handler.__tag === "Handler") {
      expect(handler.content.toMsg("")).toBe(
        "child:1",
      );
    }
    // static attrs pass through untouched
    expect(staticAttr).toEqual({
      __tag: "Attr",
      content: { name: "class", value: "inc" },
    });
    // text child preserved
    expect(wrapped.content.children[0]).toEqual({
      __tag: "Text",
      content: { value: "+" },
    });
  }
});

test("mapHtml on a bare text node is identity-ish", () => {
  expect(
    mapHtml((n: number) => n)(text("hi")),
  ).toEqual({
    __tag: "Text",
    content: { value: "hi" },
  });
});
