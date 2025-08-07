/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * General exception class for non-validation errors.
 * Extends BaseError with standard error functionality.
 * Used for general application errors that are not validation-specific.
 * 
 * @example
 * throw new Exception("Unexpected error occurred", originalError);
 */
export class Exception extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "Exception";
}
