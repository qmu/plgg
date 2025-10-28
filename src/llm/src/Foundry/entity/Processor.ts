import { Medium } from 'autoplgg/index';

export type Processor = {
  id: string;
  description: string;
  inputType: string;
  outputType: string;
  process: (input: Medium) => unknown;
};
