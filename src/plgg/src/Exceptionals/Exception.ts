import { BaseError } from "plgg/Exceptionals/BaseError";

/**
 * General exception class for non-validation errors.
 */
export class Exception extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "Exception";
}
