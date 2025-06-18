import { BaseError } from "plgg/index";

export class ValidationError extends BaseError {
  /**
   * Name
   */
  public name = "ValidationError";
}
