import { BaseError } from "plgg/Exceptionals/BaseError";
import { pattern } from "plgg/index";

/**
 * General exception class for non-validation errors.
 */
export class Exception extends BaseError {
  /**
   * Error name identifier.
   */
  public name = "Exception";

  /**
   * Box tag, so this variant folds by tag through `match`. Non-enumerable
   * getter — does not affect JSON output.
   */
  public get __tag(): "Exception" {
    return "Exception";
  }
}

/**
 * Pattern matcher for folding an {@link Exception} with `match` by name.
 */
export const exception$ = () =>
  pattern("Exception")();
