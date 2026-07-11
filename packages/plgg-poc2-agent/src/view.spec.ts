import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { guideHref } from "./view.ts";

// The citation link scheme: guide corpus file → the live
// site's route (plggpress SSG file→route mapping).
test("guideHref maps corpus files onto guide routes", () =>
  all([
    check(
      guideHref("concepts/option.md"),
      toBe(
        "https://plgg.qmu.co.jp/concepts/option",
      ),
    ),
    check(
      guideHref("index.md"),
      toBe("https://plgg.qmu.co.jp/"),
    ),
    check(
      guideHref("concepts/index.md"),
      toBe("https://plgg.qmu.co.jp/concepts/"),
    ),
  ]));
