/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * General exception class for non-validation errors.
 * Extends BaseError with standard error functionality.
 */
export class Exception extends BaseError {
  /**
   * Name
   */
  public name = "Exception";
}
