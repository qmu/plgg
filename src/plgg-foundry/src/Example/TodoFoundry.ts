import { proc, asStr } from "plgg";
import {
  makeFoundrySpec,
  makeProcessorSpec,
} from "plgg-foundry/index";

export const todos: Array<string> = [];

export const todoFoundrySpec = makeFoundrySpec({
  description:
    "This is TODO management foundry. This foundry analyzes the input text and divides into small tasks to be added to the TODO list.",
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
            todos.push(v.content);
            console.log(
              "Side effective todo update with:",
              v,
            );
          },
        ),
    }),
  ],
});
