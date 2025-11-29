import { test, assert, expect } from "vitest";
import { isOk, proc, bind } from "plgg";
import {
  asOrder,
  extractOpcodes,
  isProcessor,
  isSwitcher,
} from "plgg-foundry/index";
import { blueprint } from "plgg-foundry/Foundry/usecase";
import { makeTestFoundry } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("Blueprint generation with test foundry", async () => {
  const result = await proc(
    bind(
      [
        "foundry",
        () => makeTestFoundry(),
      ],
      [
        "order",
        () =>
          asOrder({
            text: "Create a fantasy warrior character",
          }),
      ],
    ),
    ({ foundry, order }) =>
      proc(order, blueprint(foundry)),
  );

  assert(
    isOk(result),
    "Blueprint should generate valid alignment",
  );

  console.log(result.content);
}, 30000);

test("extractOpcodes extracts processor opcodes from testFoundry", () => {
  const foundry = makeTestFoundry();

  const processorOpcodes = extractOpcodes(
    foundry.apparatuses,
    isProcessor,
  );

  expect(processorOpcodes).toEqual([
    "plan",
    "analyze",
    "gen-main",
    "gen-spread",
  ]);
});

test("extractOpcodes extracts switcher opcodes from testFoundry", () => {
  const foundry = makeTestFoundry();

  const switcherOpcodes = extractOpcodes(
    foundry.apparatuses,
    isSwitcher,
  );

  expect(switcherOpcodes).toEqual([
    "check-validity",
  ]);
});
