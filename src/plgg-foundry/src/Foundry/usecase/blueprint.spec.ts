import { test, assert, expect } from "vitest";
import { isOk, proc } from "plgg";
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

  assert(
    isOk(result),
    "Blueprint should generate valid alignment",
  );

  console.log(result.content);
}, 30000);

test("extractOpcodes extracts processor opcodes from todoFoundry", () => {
  const processorOpcodes = extractOpcodes(
    todoFoundry.apparatuses,
    isProcessor,
  );

  expect(processorOpcodes).toEqual([
    "add",
    "remove",
  ]);
});

test("extractOpcodes extracts switcher opcodes from todoFoundry", () => {
  const switcherOpcodes = extractOpcodes(
    todoFoundry.apparatuses,
    isSwitcher,
  );

  expect(switcherOpcodes).toEqual([]);
});
