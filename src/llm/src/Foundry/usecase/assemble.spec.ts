import { test, assert } from "vitest";
import { isErr, proc, packAsNonEmptyStr } from "plgg";
import { Foundry } from "autoplgg/index";
import { plan, assemble, operate } from "autoplgg/Foundry/usecase";

test("Character Image Generation", async () => {
  type Base64 = string;

  type Image = Readonly<{
    base64: Base64;
  }>;
  type ImageMediumValue = ReadonlyArray<Image>;
  type StringMediumValue = string;

  const isImage = (a: unknown): a is ImageMediumValue =>
    Array.isArray(a) &&
    a.every((item) => typeof item === "object" && "base64" in item);

  const isString = (a: unknown): a is StringMediumValue =>
    typeof a === "string";

  const descriptionResult = packAsNonEmptyStr(
    `This is a foundry for generating character designs based on text prompts and reference images.`,
  );
  if (isErr(descriptionResult)) {
    throw new Error("Failed to create description");
  }

  const foundry: Foundry = {
    description: descriptionResult.content,
    processors: [
      {
        id: "plan",
        description: "Plans the character design based on the prompt",
        inputType: "string",
        outputType: "string",
        process: (medium) => {
          if (!isString(medium.value)) {
            throw new Error("Invalid medium value for planning step");
          }
          // console.log("01:plan");
          return "Well-planned character design description";
        },
      },
      {
        id: "analyze",
        description: "Analyzes reference images for character features",
        inputType: "image[]",
        outputType: "string",
        process: (medium) => {
          if (!isImage(medium.value)) {
            throw new Error("Invalid medium value for analyzing step");
          }
          // console.log("02:analyze");
          return [{ base64: "base64imagestring" }];
        },
      },
      {
        id: "genMain",
        description: "Generates the main character image",
        inputType: "string",
        outputType: "image[]",
        process: (medium) => {
          if (!isString(medium.value)) {
            throw new Error("Invalid medium value for main generation step");
          }
          // console.log("03:genMain");
          return [{ base64: "base64imagestring" }];
        },
      },
      {
        id: "genSpread",
        description: "Generates spread images for the character",
        inputType: "image[]",
        outputType: "image[]",
        process: (medium) => {
          if (!isImage(medium.value)) {
            throw new Error("Invalid medium value for spread generation step");
          }
          // console.log("04:genSpread");
          return [{ base64: "base64imagestring" }];
        },
      },
    ],
    switchers: [
      {
        id: "checkValidity",
        description: "Checks for inappropriate content in images",
        input: "image[]",
        outputWhenTrue: "image[]",
        outputWhenFalse: "string",
        check: (medium) => {
          if (!isImage(medium.value)) {
            throw new Error("Invalid medium value for censoring step");
          }
          // console.log("validity check");
          const isValid = Math.random() < 0.5;
          return [
            isValid,
            isValid
              ? medium.value
              : "Plan once again to avoid inappropriate content",
          ];
        },
      },
    ],
  };

  const result = await proc(
    "A fantasy character with a sword and shield",
    plan(foundry),
    assemble(foundry),
    operate,
  );
  if (isErr(result)) {
    assert.fail(`Process failed: ${result.content.message}`);
  }
  // console.log(
  //   JSON.stringify(result.content, null, 2)
  // );
});
