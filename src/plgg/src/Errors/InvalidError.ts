/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * Error class for validation failures.
 * Extends BaseError and includes support for sibling errors.
 */
export class InvalidError extends BaseError {
  /**
   * Name
   */
  public name = "InvalidError";

  /**
   * Sibling errors that occurred during validation.
   */
  public sibling: ReadonlyArray<InvalidError> = [];

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
    sibling?: ReadonlyArray<InvalidError>;
  }) {
    super(message, parent);
    this.sibling = sibling || [];
  }
}
