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
    makeProcessor({
      name: "remove",
      description: `Removes a task by todo text (not id)`,
      arguments: {
        task: {
          type: "string",
          description:
            "The todo text to remove (e.g. 'A', 'B')",
        },
      },
      fn: ({ params }) =>
        proc(params["task"], asSoftStr, (v) => {
          const index = todos.findIndex(
            (t) => t.todo === v,
          );
          if (index !== -1) {
            todos.splice(index, 1);
            console.log(
              "Side effective todo removal:",
              v,
            );
          }
        }),
    }),
  ],
});
