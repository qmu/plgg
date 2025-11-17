import { isBin, isVec } from "plgg";
import { FoundrySpec } from "plgg-foundry/index";

export const newTestFoundrySpec = (
  apiKey: string,
): FoundrySpec => ({
  apiKey,
  description:
    "This is a foundry for generating character designs based on text prompts and reference images.",
  processors: [
    {
      name: "plan",
      description:
        "Plans the character design based on the prompt",
      arguments: { prompt: { type: "string" } },
      returns: { plan: { type: "string" } },
      process: async (medium) => {
        const value = medium.params[0]?.value;
        if (typeof value !== "string") {
          throw new Error(
            "Invalid medium value for planning step",
          );
        }
        return "Well-planned character design description";
      },
    },
    {
      name: "analyze",
      description:
        "Analyzes reference images for character features",
      arguments: { images: { type: "image[]" } },
      returns: { features: { type: "string" } },
      process: async (medium) => {
        const value = medium.params[0]?.value;
        if (
          !isVec(value) ||
          !value.every(isBin)
        ) {
          throw new Error(
            "Invalid medium value for analyzing step",
          );
        }
        return "Extracted character features from reference images";
      },
    },
    {
      name: "gen-main",
      description:
        "Generates the main character image",
      arguments: {
        description: { type: "string" },
      },
      returns: { image: { type: "image[]" } },
      process: async (medium) => {
        const value = medium.params[0]?.value;
        if (typeof value !== "string") {
          throw new Error(
            "Invalid medium value for main generation step",
          );
        }
        return [new Uint8Array([0])];
      },
    },
    {
      name: "gen-spread",
      description:
        "Generates spread images for the character",
      arguments: {
        mainImage: { type: "image[]" },
      },
      returns: {
        spreadImages: { type: "image[]" },
      },
      process: async (medium) => {
        const value = medium.params[0]?.value;
        if (
          !isVec(value) ||
          !value.every(isBin)
        ) {
          throw new Error(
            "Invalid medium value for spread generation step",
          );
        }
        return [
          new Uint8Array([1]),
          new Uint8Array([2]),
          new Uint8Array([3]),
        ];
      },
    },
  ],
  switchers: [
    {
      name: "check-validity",
      description:
        "Checks for inappropriate content in images, if invalid go back to former step",
      arguments: {
        images: { type: "image[]" },
      },
      returnsWhenTrue: {
        validImages: { type: "image[]" },
      },
      returnsWhenFalse: {
        feedback: { type: "string" },
      },
      check: async (medium) => {
        const value = medium.params[0]?.value;
        if (
          !isVec(value) ||
          !value.every(isBin)
        ) {
          throw new Error(
            "Invalid medium value for censoring step",
          );
        }
        const isValid = Math.random() < 0.5;
        return [
          isValid,
          isValid
            ? value
            : "Plan once again to avoid inappropriate content",
        ];
      },
    },
  ],
  packers: [
    {
      name: "mainImage",
      processedBy: "gen-main",
    },
    {
      name: "spreadImages",
      processedBy: "gen-spread",
    },
    {
      name: "plannedDescription",
      processedBy: "plan",
    },
  ],
});
