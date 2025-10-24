import { Vec } from "plgg";
import { Operation } from "autoplgg/index";

export type Alignment = {
  instruction: string;
  operations: Vec<Operation>;
};
