import { BaseError } from "plgg/Exceptionals/BaseError";

/**
 * Error class for serialization failures.
 */
export class SerializeError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "SerializeError";

  /**
   * Creates a new SerializeError instance.
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
