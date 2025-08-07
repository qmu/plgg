/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * Error class for validation failures.
 * Extends BaseError and includes support for sibling errors for accumulating multiple validation failures.
 * 
 * @example
 * new InvalidError({
 *   message: "Validation failed",
 *   sibling: [error1, error2] // Multiple validation errors
 * });
 */
export class InvalidError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "InvalidError";

  /**
   * Sibling errors that occurred during validation.
   * Used to accumulate multiple validation failures.
   */
  public sibling: ReadonlyArray<InvalidError> = [];

  /**
   * Creates a new InvalidError instance.
   * 
   * @param options - Error configuration object
   * @param options.message - Error message
   * @param options.parent - Optional parent error
   * @param options.sibling - Optional array of sibling validation errors
   */
  constructor({
    message,
    parent,
    sibling,
  }: {
    message: string;
    parent?: BaseError | Error;
    sibling?: ReadonlyArray<InvalidError>;
  }) {
    super(message, parent);
    this.sibling = sibling || [];
  }
}
