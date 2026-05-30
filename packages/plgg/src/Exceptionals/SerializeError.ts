import { BaseError } from "plgg/Exceptionals/BaseError";
import { pattern } from "plgg/index";

/**
 * Error class for serialization failures.
 */
export class SerializeError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "SerializeError";

  /**
   * Box tag, so this variant folds by tag through `match`. Non-enumerable
   * getter — does not affect JSON output.
   */
  public get __tag(): "SerializeError" {
    return "SerializeError";
  }

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

/**
 * Pattern matcher for folding a {@link SerializeError} with `match` by name.
 */
export const serializeError$ = () =>
  pattern("SerializeError")();
