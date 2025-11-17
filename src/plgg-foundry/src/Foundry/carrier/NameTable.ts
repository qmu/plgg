import { Obj } from "plgg";

export type VariableName = string; // argument/return key
export type Address = string; // register address

export type NameTable = Obj<
  Record<VariableName, Address>
>;
