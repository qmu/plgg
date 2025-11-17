import { Obj } from "plgg";

export type VariableName = string; // argument/return key
export type Address = string; // register address

export type IO = Obj<
  Record<VariableName, Address>
>;
