import { Param, Address } from "plgg-foundry/index";

/**
 * Environment storing register machine state as address-param mappings.
 */
export type Env = Readonly<Record<Address, Param>>;
