/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

export class ValidationError extends BaseError {
  /**
   * Name
   */
  public name = "ValidationError";

  /**
   *
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
