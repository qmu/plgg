import {
  EgressOperation,
  IngressOperation,
  InternalOperation,
} from "plgg-foundry/index";

export type Operation =
  | EgressOperation
  | IngressOperation
  | InternalOperation;
