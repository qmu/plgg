import { proc, asSoftStr, asNum } from "plgg";
import {
  makeFoundry,
  makeProcessor,
} from "plgg-foundry/index";

export const todos = new Map<number, string>();

/**
 * Next id derived from the store (max key + 1) — no mutable counter to drift out
 * of sync with the map.
 */
const nextId = (
  store: Map<number, string>,
): number =>
  (store.size === 0
    ? 0
    : Math.max(...store.keys())) + 1;

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
          todos.set(nextId(todos), v);
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
