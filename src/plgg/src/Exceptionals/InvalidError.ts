import { BaseError } from "plgg/Exceptionals/BaseError";
import { SoftStr, pattern } from "plgg/index";

/**
 * Error class for validation failures.
 */
export class InvalidError extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "InvalidError";

  /**
   * Box tag, so `match(error)([pattern("InvalidError")(), …])` folds this
   * variant by tag. Non-enumerable getter — does not affect JSON output.
   */
  public get __tag(): "InvalidError" {
    return "InvalidError";
  }

  /**
   * Sibling errors that occurred during validation.
   */
  public sibling: ReadonlyArray<InvalidError> =
    [];

  /**
   * Box content — widens the base payload with the validation `sibling`s, so a
   * `match` arm on `"InvalidError"` reads the structured failure (message +
   * nested errors), not just a string. Non-enumerable getter.
   */
  public override get content(): Readonly<{
    message: SoftStr;
    sibling: ReadonlyArray<InvalidError>;
  }> {
    return {
      message: this.message,
      sibling: this.sibling,
    };
  }

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

/**
 * Pattern matcher for folding an {@link InvalidError} with `match` by name.
 */
export const invalidError$ = () =>
  pattern("InvalidError")();
