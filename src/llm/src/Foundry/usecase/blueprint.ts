import {
  FoundrySpec,
  Alignment,
} from "autoplgg/index";

export const plan =
  (_foundry: FoundrySpec) =>
  (instruction: string): Alignment => {
    const examplAlignment: Alignment = {
      instruction,
      operations: [
        {
          type: "processor",
          initial: true,
          id: "plan",
          to: "gen-main",
        },
        {
          type: "processor",
          id: "gen-main",
          to: "check-validity",
        },
        {
          type: "switcher",
          id: "check-validity",
          whenTrue: "gen-spread",
          whenFalse: "plan",
        },
        {
          type: "processor",
          id: "gen-spread",
          final: true,
        },
      ],
    };

    return examplAlignment;
  };
