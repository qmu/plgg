import { proc, asSoftStr } from "plgg";
import {
  makeFoundry,
  makeProcessor,
} from "plgg-foundry/index";

export const todos: Array<string> = [];

export const todoFoundry = makeFoundry({
  description: `A foundry of TODOs.

- Analyzes and divides input to add TODOs.`,
  apparatuses: [
    makeProcessor({
      name: "add",
      description: `This is a processor to Add new task`,
      arguments: {
        task: { type: "string" },
      },
      fn: ({ params }) =>
        proc(params["task"], asSoftStr, (v) => {
          todos.push(v);
          console.log(
            "Side effective todo update with:",
            v,
          );
        }),
    }),
  ],
});
