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
          type: "ingress",
          next: "plan",
          promptAddr: "r0",
        },
        {
          type: "process",
          opcode: "plan",
          next: "gen-main",
          loadAddr: "r0",
          saveAddr: "r1",
        },
        {
          type: "process",
          opcode: "gen-main",
          next: "check-validity",
          loadAddr: "r1",
          saveAddr: "r2",
        },
        {
          type: "switch",
          opcode: "check-validity",
          nextWhenTrue: "gen-spread",
          nextWhenFalse: "plan",
          loadAddr: "r2",
          saveAddrTrue: "r3",
          saveAddrFalse: "r0",
        },
        {
          type: "process",
          opcode: "gen-spread",
          exit: true,
          loadAddr: "r2",
          saveAddr: "r3",
        },
        {
          type: "egress",
          result: {
            mainImage: "r2",
            spreadImage: "r3",
          },
        },
      ],
    };

    return examplAlignment;
  };
