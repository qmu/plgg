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
          type: "process",
          initial: true,
          opcode: "plan",
          next: "gen-main",
          dist: "r0",
        },
        {
          type: "process",
          opcode: "gen-main",
          next: "check-validity",
          src: "r0",
          dist: "r1",
        },
        {
          type: "switch",
          opcode: "check-validity",
          whenTrue: "gen-spread",
          whenFalse: "gen-main",
          src: "r1",
          distWhenTrue: "r2",
          distWhenFalse: "r0",
        },
        {
          type: "process",
          opcode: "gen-spread",
          final: true,
          src: "r2",
          dist: "r3",
        },
      ],
    };

    return examplAlignment;
  };
