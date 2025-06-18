import { BaseError } from "plgg/lib/index";

export class ValidationError extends BaseError {
  /**
   * Name
   */
  public name = "ValidationError";
}
