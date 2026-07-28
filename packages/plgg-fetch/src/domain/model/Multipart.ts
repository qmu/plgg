import {
  SoftStr,
  Option,
  fromNullable,
} from "plgg";

/**
 * A plain form field: a `name` and a text `value`. Tagged so a
 * {@link MultipartPart} folds without inspecting shape.
 */
export type MultipartField = Readonly<{
  kind: "field";
  name: SoftStr;
  value: SoftStr;
}>;

/**
 * A file part: a `name`, a `filename`, the raw `bytes`, and an optional
 * `contentType` (absent ⇒ the platform's default when encoded). Binary is a
 * `Uint8Array`, never text, so a file crosses the transport without a
 * lossy string round-trip.
 */
export type MultipartFile = Readonly<{
  kind: "file";
  name: SoftStr;
  filename: SoftStr;
  bytes: Uint8Array;
  contentType: Option<SoftStr>;
}>;

/**
 * One part of a `multipart/form-data` body — a text field or a file.
 */
export type MultipartPart =
  | MultipartField
  | MultipartFile;

/**
 * A `multipart/form-data` request body as plgg-native DATA: an ordered list
 * of parts. The vendor seam encodes it to a platform `FormData` at the edge —
 * the domain never touches a Web type. This is what lets a seam POST an upload
 * through the typed transport instead of falling back to raw `fetch`.
 */
export type Multipart = ReadonlyArray<MultipartPart>;

/**
 * Builds a text {@link MultipartField}.
 */
export const field = (
  name: SoftStr,
  value: SoftStr,
): MultipartField => ({
  kind: "field",
  name,
  value,
});

/**
 * Builds a {@link MultipartFile}; `contentType` is optional.
 */
export const file = (
  name: SoftStr,
  filename: SoftStr,
  bytes: Uint8Array,
  contentType?: SoftStr,
): MultipartFile => ({
  kind: "file",
  name,
  filename,
  bytes,
  contentType: fromNullable(contentType),
});

/**
 * Assembles the parts into a {@link Multipart} body.
 */
export const multipart = (
  parts: ReadonlyArray<MultipartPart>,
): Multipart => parts;
