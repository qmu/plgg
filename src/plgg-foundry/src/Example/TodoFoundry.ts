import { proc, asSoftStr } from "plgg";
import {
  makeFoundrySpec,
  makeProcessorSpec,
} from "plgg-foundry/index";

export const todos: Array<string> = [];

export const todoFoundrySpec = makeFoundrySpec({
  description: `A foundry of TODOs. 

- Analyzes and divides input to add TODOs.`,
  apparatuses: [
    makeProcessorSpec({
      name: "add",
      description: `This is a processor to Add new task`,
      arguments: {
        task: { type: "string" },
      },
      fn: ({ params }) =>
        proc(
          params["task"]?.value,
          asSoftStr,
          (v) => {
            todos.push(v);
            console.log(
              "Side effective todo update with:",
              v,
            );
          },
        ),
    }),
  ],
});
