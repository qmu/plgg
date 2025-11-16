import {
  Foundry,
  Alignment,
  Param,
} from "plgg-foundry/index";

export type Env = ReadonlyArray<Param>;

export type OperationContext = {
  foundry: Foundry;
  alignment: Alignment;
  env: Env; // Register Machine Environment Variables
  operationCount: number;
};
