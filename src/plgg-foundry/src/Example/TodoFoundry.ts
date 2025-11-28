import { ok, bind, proc, asStr } from "plgg";
import {
  makeFoundrySpec,
  makeProcessorSpec,
  makePackerSpec,
} from "plgg-foundry/index";

export const buildSpec = async () =>
  proc(
    bind(
      [
        "addProcessor",
        () =>
          makeProcessorSpec({
            name: "add",
            description: `Add new task`,
            arguments: {
              task: { type: "string" },
            },
            returns: {},
            fn: (medium) =>
              proc(
                medium.params["task"]?.value,
                asStr,
                (v) => {
                  console.log(
                    "Side effective todo update with:",
                    v,
                  );
                },
              ),
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
    ),
    ({ addProcessor, packer }) =>
      ok(
        makeFoundrySpec({
          description:
            "This is a foundry for virtual file system.",
          apparatuses: [addProcessor, packer],
        }),
      ),
  );
