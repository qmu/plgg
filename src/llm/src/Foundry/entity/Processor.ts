import { Medium } from "autoplgg/index";

export type Processor = {
  id: string;
  description: string;
  input: string;
  output: string;
  process: (input: Medium) => unknown;
};
