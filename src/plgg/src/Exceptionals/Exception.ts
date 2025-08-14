/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * General exception class for non-validation errors.
 */
export class Exception extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "Exception";
}
