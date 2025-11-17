import { Obj } from "plgg";
import {
  Foundry,
  Alignment,
  Param,
  Address,
} from "plgg-foundry/index";

export type Env = Obj<Record<Address, Param>>;

export type OperationContext = {
  foundry: Foundry;
  alignment: Alignment;
  env: Env; // Register Machine Environment Variables
  operationCount: number;
};
