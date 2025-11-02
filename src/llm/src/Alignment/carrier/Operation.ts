import {
  EgressOperation,
  IngressOperation,
  InternalOperation,
} from "autoplgg/index";

export type Operation =
  | EgressOperation
  | IngressOperation
  | InternalOperation;
