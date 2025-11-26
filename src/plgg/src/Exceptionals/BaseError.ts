import {
  Option,
  none,
  newSome,
} from "plgg/index";

/**
 * Base error class for all Plgg errors.
 */
export class BaseError extends Error {
  /**
   * Error name identifier.
   */
  public name = "BaseError";

  /**
   * Brand identifier for Plgg error types.
   */
  public __ = "PlggError";

  /**
   * Optional additional detail about the error.
   */
  public detail: Option<string> = none();

  /**
   * Optional parent error for error chaining.
   */
  public parent: Option<BaseError | Error> =
    none();

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
      : none();
  }
}
