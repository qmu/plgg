import { proc, asSoftStr } from "plgg";
import {
  makeFoundry,
  makeProcessor,
} from "plgg-foundry/index";

export const todos: Array<{
  id: string;
  todo: string;
}> = [];
let id = 0;

export const todoFoundry = makeFoundry({
  description: `A foundry of TODOs.

Analyzes and divides input to add and remove TODO.`,
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
            id: ++id + "",
            todo: v,
          });
        }),
    }),
    makeProcessor({
      name: "remove",
      description: `Removes a task by todo id`,
      arguments: {
        id: {
          type: "string",
          description: "The todo id to remove",
        },
      },
      fn: ({ params }) =>
        proc(params["id"], asSoftStr, (v) => {
          const index = todos.findIndex(
            (t) => t.id === v,
          );
          if (index !== -1) {
            todos.splice(index, 1);
          }
        }),
    }),
  ],
});
