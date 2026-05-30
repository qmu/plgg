import { BaseError } from "plgg/Exceptionals/BaseError";
import { pattern } from "plgg/index";

/**
 * Error class for deserialization failures.
 */
export class DeserializeError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "DeserializeError";

  /**
   * Box tag, so this variant folds by tag through `match`. Non-enumerable
   * getter — does not affect JSON output.
   */
  public get __tag(): "DeserializeError" {
    return "DeserializeError";
  }

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

/**
 * Pattern matcher for folding a {@link DeserializeError} with `match` by name.
 */
export const deserializeError$ = () =>
  pattern("DeserializeError")();
