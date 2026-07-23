import {
  test,
  check,
  toBe,
} from "plgg-test";
import {
  nodeConsole,
  readArgv,
} from "plgg-cli/index";

test("nodeConsole.out writes a line without throwing", () => {
  nodeConsole.out("plgg-cli seam spec: stdout line");
  return check(true, toBe(true));
});

test("nodeConsole.err writes a line without throwing", () => {
  nodeConsole.err("plgg-cli seam spec: stderr line");
  return check(true, toBe(true));
});

test("nodeConsole.fail sets a non-zero exit code, then restores it", () => {
  nodeConsole.fail();
  const code = process.exitCode;
  process.exitCode = 0;
  return check(code, toBe(1));
});

test("readArgv returns the arguments after node <script>", () =>
  check(Array.isArray(readArgv()), toBe(true)));
