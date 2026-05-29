import { proc, asSoftStr, asNum } from "plgg";
import {
  makeFoundry,
  makeProcessor,
} from "plgg-foundry/index";

export const todos = new Map<number, string>();
let id = 0;

export const todoFoundry = makeFoundry({
  description: `A foundry of TODOs.
Analyzes and divides input to add and remove TODO.`,
  apparatuses: [
    makeProcessor({
      name: "add",
      description: `Inserts new todo`,
      arguments: {
        todo: { type: "string" },
      },
      fn: ({ params }) =>
        proc(params["todo"], asSoftStr, (v) => {
          todos.set(++id, v);
        }),
    }),
    makeProcessor({
      name: "remove",
      description: `Removes a todo by todo id`,
      arguments: {
        id: {
          type: "number",
          description:
            "The numeric id of the todo to remove",
        },
      },
      fn: ({ params }) =>
        proc(params["id"], asNum, (v) => {
          todos.delete(v);
        }),
    }),
  ],
});
