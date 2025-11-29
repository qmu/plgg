import { proc, asSoftStr } from "plgg";
import {
  makeFoundry,
  makeProcessor,
} from "plgg-foundry/index";

export const todos: Array<{
  id: string;
  todo: string;
}> = [];

export const todoFoundry = makeFoundry({
  description: `A foundry of TODOs.

- Analyzes and divides input to add TODO.`,
  apparatuses: [
    makeProcessor({
      name: "add",
      description: `Inserts new task`,
      arguments: {
        task: { type: "string" },
      },
      fn: ({ params }) =>
        proc(params["task"], asSoftStr, (v) => {
          todos.push({
            id: new Date().toISOString(),
            todo: v,
          });
          console.log(
            "Side effective todo update with:",
            v,
          );
        }),
    }),
  ],
});
