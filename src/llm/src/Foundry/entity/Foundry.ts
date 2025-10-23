import { Processor, Switcher } from "autoplgg/index";

export type Foundry = {
  description: string;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
};
