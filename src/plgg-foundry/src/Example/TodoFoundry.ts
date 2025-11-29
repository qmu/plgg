import { proc, asStr } from "plgg";
import {
  makeFoundrySpec,
  makeProcessorSpec,
} from "plgg-foundry/index";

export const todoFoundrySpec = makeFoundrySpec({
  description:
    "This is a foundry for virtual file system.",
  apparatuses: [
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
});
