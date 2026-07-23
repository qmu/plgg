import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
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

  if (wrapped.__tag !== "Element") {
    return check(wrapped.__tag, toBe("Element"));
  }
  const [handler, staticAttr] =
    wrapped.content.attributes;
  return all([
    // the click handler's Msg is now a string
    handler && handler.__tag === "Handler"
      ? check(
          handler.content.toMsg(""),
          toBe("child:1"),
        )
      : check("not-handler", toBe("Handler")),
    // static attrs pass through untouched
    check(staticAttr, toEqual({
      __tag: "Attr",
      content: { name: "class", value: "inc" },
    })),
    // text child preserved
    check(wrapped.content.children[0], toEqual({
      __tag: "Text",
      content: { value: "+" },
    })),
  ]);
});

test("mapHtml on a bare text node is identity-ish", () =>
  check(
    mapHtml((n: number) => n)(text("hi")),
    toEqual({
      __tag: "Text",
      content: { value: "hi" },
    }),
  ));
