import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { defaultTheme } from "plggmatic/Style";
import { carouselCss } from "plggmatic/Style/usecase/carouselCss";
import { carouselInitScript } from "plggmatic/Navigate/usecase/carouselScript";
import {
  shareClass,
  carouselPrevClass,
  carouselNextClass,
} from "plggmatic/Meta/model/classHooks";

test("the carousel runtime names the strip and its two controls from the framework's own hooks", () =>
  all([
    check(
      carouselInitScript,
      toContain('"' + "." + shareClass + '"'),
    ),
    check(
      carouselInitScript,
      toContain('"' + carouselPrevClass + '"'),
    ),
    check(
      carouselInitScript,
      toContain('"' + carouselNextClass + '"'),
    ),
    // it steps past whatever is pinned over the strip
    check(
      carouselInitScript,
      toContain("scrollPaddingLeft"),
    ),
    // safe inside a host's script element
    check(
      carouselInitScript.includes("</script"),
      toBe(false),
    ),
  ]));

test("the controls' chrome is escape-safe, hides by attribute and clears the pinned width", () => {
  const css = carouselCss(defaultTheme);
  return all([
    check(/[<>&]/.test(css), toBe(false)),
    check(
      css,
      toContain(
        ".pm-carousel-prev[hidden],.pm-carousel-next[hidden]{display:none;}",
      ),
    ),
    check(
      css,
      toContain(
        ".pm-carousel-prev{left:calc(var(--pm-share-inset,0px) + .6rem);}",
      ),
    ),
  ]);
});
