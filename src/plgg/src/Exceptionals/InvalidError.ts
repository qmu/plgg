/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

/**
 * Error class for validation failures.
 */
export class InvalidError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "InvalidError";

  /**
   * Sibling errors that occurred during validation.
   */
  public sibling: ReadonlyArray<InvalidError> =
    [];

  /**
   * Creates a new InvalidError instance.
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
