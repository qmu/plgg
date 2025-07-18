/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * Error class for validation failures.
 * Extends BaseError and includes support for sibling errors.
 */
export class ValidationError extends BaseError {
  /**
   * Name
   */
  public name = "ValidationError";

  /**
   * Sibling errors that occurred during validation.
   */
  public sibling: ReadonlyArray<ValidationError> = [];

  /**
   * Constructor
   */
  constructor({
    message,
    parent,
    sibling,
  }: {
    message: string;
    parent?: BaseError | Error;
    sibling?: ReadonlyArray<ValidationError>;
  }) {
    super(message, parent);
    this.sibling = sibling || [];
  }
}
