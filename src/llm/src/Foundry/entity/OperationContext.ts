import {
  FoundrySpec,
  Alignment,
  Medium,
} from "autoplgg/index";

export type OperationContext = {
  foundry: FoundrySpec;
  alignment: Alignment;
  medium: Medium;
};
