import { test, assert, expect } from "vitest";
import {
  pipe,
  proc,
  isErr,
  isOk,
  atProp,
} from "plgg";
import {
  FoundrySpec,
  asAlignment,
  asFoundry,
} from "plgg-foundry/index";
import { operate } from "plgg-foundry/Foundry/usecase";
import { newTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("OperationContext: assemble -> operate with example blueprint", async () => {
  const specArg: FoundrySpec = newTestFoundrySpec(
    "no api key needed",
  );

  const maybeAlignment = asAlignment({
    userRequestAnalysis:
      "User wants a fantasy character image with sword and shield",
    compositionRationale:
      "Use plan->generate->validate loop to create character",
    userRequest:
      "A fantasy character with a sword and shield",
    operations: [
      {
        type: "ingress",
        next: "plan",
        promptAddr: "r0",
      },
      {
        type: "process",
        opcode: "plan",
        next: "gen-main",
        loadAddr: "r0",
        saveAddr: "r1",
      },
      {
        type: "process",
        opcode: "gen-main",
        next: "check-validity",
        loadAddr: "r1",
        saveAddr: "r2",
      },
      {
        type: "switch",
        opcode: "check-validity",
        nextWhenTrue: "gen-spread",
        nextWhenFalse: "plan",
        loadAddr: "r2",
        saveAddrTrue: "r3",
        saveAddrFalse: "r0",
      },
      {
        type: "process",
        opcode: "gen-spread",
        next: "egress",
        loadAddr: "r2",
        saveAddr: "r3",
      },
      {
        type: "egress",
        result: {
          mainImage: "r2",
          spreadImages: "r3",
        },
      },
    ],
  });

  assert(isOk(maybeAlignment));

  // Test the flow: assemble -> operate
  const result = await proc(
    specArg,
    asFoundry,
    (foundrySpec) =>
      proc(
        maybeAlignment.content,
        operate(foundrySpec),
      ),
  );

  // Assert the result is successful
  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
  const mainImage = pipe(
    result.content.value,
    atProp("mainImage"),
  );
  assert(isOk(mainImage));
  assert(Array.isArray(mainImage.content));
  expect(mainImage.content[0]).toBeInstanceOf(
    Uint8Array,
  );
  const spreadImages = pipe(
    result.content.value,
    atProp("spreadImages"),
  );
  assert(isOk(spreadImages));
  expect(spreadImages.content).toBeInstanceOf(
    Array,
  );
});
