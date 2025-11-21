import {
  Param,
  Alignment,
  Address,
} from "plgg-foundry/index";

/**
 * Execution environment passed to processors and switchers containing alignment and register data.
 */
export type Medium = Readonly<{
  alignment: Alignment;
  params: Record<Address, Param>;
}>;
