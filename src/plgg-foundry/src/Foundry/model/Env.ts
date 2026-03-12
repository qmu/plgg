import {
  RegisterEntry,
  Address,
} from "plgg-foundry/index";

/**
 * Environment storing register machine state as address-to-register-entry mappings.
 */
export type Env = Readonly<
  Record<Address, RegisterEntry>
>;
