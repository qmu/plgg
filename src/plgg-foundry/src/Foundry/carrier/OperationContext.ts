import {
  Foundry,
  Alignment,
  Param,
  Address,
} from "plgg-foundry/index";

export type Env = Readonly<
  Record<Address, Param>
>;

export type OperationContext = {
  foundry: Foundry;
  alignment: Alignment;
  env: Env; // Register Machine Environment Variables
  operationCount: number;
};
