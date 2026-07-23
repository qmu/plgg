import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  frameworkName,
  cssPrefix,
} from "plgg-cms/ui/Meta/model/identity";

test("frameworkName is the one word for this framework", () => {
  return check(frameworkName, toBe("plgg-cms"));
});

test("cssPrefix namespaces theme custom properties", () => {
  return all([
    check(cssPrefix, toBe("pm")),
    check(
      `--${cssPrefix}-surface`,
      toBe("--pm-surface"),
    ),
  ]);
});
