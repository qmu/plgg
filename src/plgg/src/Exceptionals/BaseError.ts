import {
  Option,
  newNone,
  newSome,
} from "plgg/index";

/**
 * Base error class for all Plgg errors.
 * Extends JavaScript Error with additional metadata and parent error tracking.
 */
export class BaseError extends Error {
  /**
   * Error name identifier.
   */
  public name = "BaseError";

  /**
   * Brand identifier for Plgg error types.
   * Used to distinguish Plgg errors from standard JavaScript errors.
   */
  public __ = "PlggError";

  /**
   * Optional additional detail about the error.
   */
  public detail: Option<string> = newNone();

  /**
   * Optional parent error for error chaining.
   * Allows building error cause chains for debugging.
   */
  public parent: Option<BaseError | Error> =
    newNone();

  /**
   * Creates a new BaseError instance.
   */
  constructor(
    message: string,
    parent?: BaseError | Error,
  ) {
    super(message);
    this.parent = parent
      ? newSome(parent)
      : newNone();
  }
}
