import { Foundry, Alignment } from "autoplgg/index";

export const plan =
  (_foundry: Foundry) =>
  (instruction: string): Alignment => {
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
