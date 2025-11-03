import { test, assert, expect } from "vitest";
import {
  pipe,
  proc,
  isErr,
  isOk,
  atProp,
} from "plgg";
import {
  FoundrySpecArg,
  Alignment,
  asFoundrySpec,
  assemble,
  operate,
} from "plgg-foundry/index";

test("OperationContext: assemble -> operate with example blueprint", async () => {
  // Define the FoundrySpec with processors and switchers
  const specArg: FoundrySpecArg = {
    description:
      "Test foundry for character design workflow",
    processors: [
      {
        name: "plan",
        description: "plan",
        process: (medium) => {
          if (typeof medium.value !== "string") {
            throw new Error(
              "Invalid medium value for planning step",
            );
          }
          return "Well-planned character design description";
        },
      },
      {
        name: "gen-main",
        description:
          "Generates the main character image",
        process: (medium) => {
          if (typeof medium.value !== "string") {
            throw new Error(
              "Invalid medium value for main generation step",
            );
          }
          const image = new Uint8Array([0]);
          return image;
        },
      },
      {
        name: "gen-spread",
        description:
          "Generates spread images for the character",
        process: (medium) => {
          if (
            !(medium.value instanceof Uint8Array)
          ) {
            throw new Error(
              "Invalid medium value for spread generation step",
            );
          }
          const image1 = new Uint8Array([1]);
          const image2 = new Uint8Array([2]);
          const image3 = new Uint8Array([3]);
          return [image1, image2, image3];
        },
      },
    ],
    switchers: [
      {
        id: "check-validity",
        description:
          "Checks for inappropriate content in images",
        check: (medium) => {
          if (
            !(medium.value instanceof Uint8Array)
          ) {
            throw new Error(
              "Invalid medium value for validity check",
            );
          }
          return [true, medium.value];
        },
      },
    ],
  };

  // Define the example Alignment (blueprint)
  const exampleAlignment: Alignment = {
    instruction:
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
        exit: true,
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
  };

  // Test the flow: assemble -> operate
  const result = await proc(
    specArg,
    asFoundrySpec,
    (foundrySpec) =>
      proc(
        exampleAlignment,
        assemble(foundrySpec),
        operate,
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
  expect(mainImage.content).toBeInstanceOf(
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
