import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  frameworkName,
  cssPrefix,
} from "plggpress/themeSupport/Meta/model/identity";

test("frameworkName is the one word for this framework", () => {
  return check(frameworkName, toBe("plggpress"));
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
