/* Exceptionally relative import to avoid circular dependencies */
import { BaseError } from "./BaseError";

export class ValidationError extends BaseError {
  /**
   * Name
   */
  public name = "ValidationError";
}
