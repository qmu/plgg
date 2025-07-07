/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

export class Exception extends BaseError {
  /**
   * Name
   */
  public name = "Exception";
}
