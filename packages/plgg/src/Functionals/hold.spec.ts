import { test, check, toBe } from "plgg-test";
import { hold } from "plgg/index";

test("bind applies function to values in pipelines", () => {
  // Example: Simple value transformation in composition
  const uppercase = (s: string) =>
    s.toUpperCase();

  return check(
    hold(uppercase)("hello"),
    toBe("HELLO"),
  );
});
