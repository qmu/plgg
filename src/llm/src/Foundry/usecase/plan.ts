import { Foundry, Alignment } from "autoplgg/index";

export const plan =
  (foundry: Foundry) =>
  (instruction: string): Alignment => {
    console.log(foundry, instruction);
    const examplAlignment: Alignment = {
      instruction,
      operations: [
        {
          type: "processor",
          initial: true,
          id: "plan",
          to: "genMain",
        },
        {
          type: "processor",
          id: "genMain",
          to: "checkValidity",
        },
        {
          type: "switcher",
          id: "checkValidity",
          whenTrue: "genSpread",
          whenFalse: "plan",
        },
        {
          type: "processor",
          id: "genSpread",
          final: true,
        },
      ],
    };

    return examplAlignment;
  };
