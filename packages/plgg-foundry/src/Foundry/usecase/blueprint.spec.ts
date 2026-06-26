import {
  test,
  check,
  toEqual,
  shouldBeOk,
} from "plgg-test";
import { proc } from "plgg";
import {
  asOrder,
  extractOpcodes,
  isProcessor,
  isSwitcher,
} from "plgg-foundry/index";
import { blueprint } from "plgg-foundry/Foundry/usecase";
import { todoFoundry } from "plgg-foundry/Example/TodoFoundry";

test.skip("Blueprint generation with todoFoundry", async () => {
  const result = await proc(
    {
      text: "Add task A and task B",
    },
    asOrder,
    blueprint(todoFoundry),
  );

  return check(result, shouldBeOk());
});

test("extractOpcodes extracts processor opcodes from todoFoundry", () =>
  check(
    extractOpcodes(
      todoFoundry.apparatuses,
      isProcessor,
    ),
    toEqual(["add", "remove"]),
  ));

test("extractOpcodes extracts switcher opcodes from todoFoundry", () =>
  check(
    extractOpcodes(
      todoFoundry.apparatuses,
      isSwitcher,
    ),
    toEqual([]),
  ));
