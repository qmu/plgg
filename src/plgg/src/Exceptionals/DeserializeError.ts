import { BaseError } from "plgg/Exceptionals/BaseError";

export class DeserializeError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "DeserializeError";

  /**
   * Creates a new DeserializeError instance.
   */
  constructor({
    message,
    parent,
  }: {
    message: string;
    parent?: BaseError | Error;
  }) {
    super(message, parent);
  }
}
