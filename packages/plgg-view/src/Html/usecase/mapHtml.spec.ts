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
  lazy,
} from "plgg-view/Html/model/element";
import { Html } from "plgg-view/Html/model/Html";
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

test("mapHtml stays lazy: it re-composes the thunk instead of forcing it", () => {
  let calls = 0;
  const child = (n: number): Html<number> => {
    calls++;
    return button(
      [onClick<number>(n)],
      [text(String(n))],
    );
  };
  const node = lazy(child, 5);
  const mapped = mapHtml(
    (n: number): string => `m:${n}`,
  )(node);
  const beforeForce = calls;
  if (mapped.__tag !== "Lazy") {
    return check(mapped.__tag, toBe("Lazy"));
  }
  // `arg` — the memo key the renderer compares `===` — carries over unchanged
  const a1 = check(mapped.content.arg, toBe(5));
  const a2 = check(beforeForce, toBe(0));
  const resolved = mapped.content.render();
  const a3 = check(calls, toBe(1));
  if (resolved.__tag !== "Element") {
    return all([
      a1,
      a2,
      a3,
      check(resolved.__tag, toBe("Element")),
    ]);
  }
  const [handler] = resolved.content.attributes;
  return all([
    a1,
    a2,
    a3,
    handler && handler.__tag === "Handler"
      ? check(
          handler.content.toMsg(""),
          toBe("m:5"),
        )
      : check("not-handler", toBe("Handler")),
  ]);
});
