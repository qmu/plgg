import { Operation } from "autoplgg/index";

export type Alignment = {
  instruction: string;
  operations: ReadonlyArray<Operation>;
};
