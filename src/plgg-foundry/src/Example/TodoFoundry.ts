import { proc, env, bind } from "plgg";
import { openai } from "plgg-kit";
import {
  makeFoundrySpec,
  makeProcessorSpec,
  makePackerSpec,
} from "plgg-foundry/index";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

export const runTocoFoundry = async () =>
  proc(
    bind(
      [
        "examineProcessor",
        () =>
          makeProcessorSpec({
            name: "examine",
            description: `This processor lets AI examine whole result of alignment.`,
            arguments: {
              input: { type: "string" },
            },
            returns: {
              comment: { type: "string" },
              terminate: { type: "boolean" },
            },
            fn: async (medium) => {
              const value =
                medium.params["prompt"]?.value;
              if (typeof value !== "string") {
                throw new Error(
                  "Invalid medium value for planning step",
                );
              }
              return {
                comment: "All good",
                terminate: false,
              };
            },
          }),
      ],
      [
        "packer",
        () =>
          makePackerSpec({
            mainImage: { type: "image[]" },
            spreadImages: { type: "image[]" },
            plannedDescription: {
              type: "string",
            },
          }),
      ],
      [
        "spec",
        ({ examineProcessor, packer }) =>
          makeFoundrySpec({
            description:
              "This is a foundry for virtual file system.",
            apparatuses: [
              examineProcessor,
              packer,
            ],
          }),
      ],
      ["apiKey", () => env("OPENAI_API_KEY")],
    ),
    ({ spec, apiKey }) =>
      proc(
        openai({
          apiKey,
          modelName: "gpt-5.1",
        }),
        (provider) =>
          proc(
            {
              prompt:
                "A fantasy character with a sword and shield",
            },
            runFoundry({
              provider,
              spec,
            }),
          ),
      ),
  );
