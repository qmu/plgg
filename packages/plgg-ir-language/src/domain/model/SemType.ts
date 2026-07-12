import {
  Box,
  SoftStr,
  box,
  pattern,
  isBoxWithTag,
  match,
} from "plgg";

/**
 * The primitive value kinds every dialect shares.
 */
export type PrimName =
  | "boolean"
  | "integer"
  | "decimal"
  | "string"
  | "date";

/**
 * One semantic type, as **pure data**: what the type
 * checker assigns to expressions and references. A
 * `Box` union over three shapes — primitives, nominal
 * domain types, and parameterized domain types. Domain
 * meaning is preserved over storage meaning: two
 * nominal types with different names are never
 * interchangeable even if both are stored as strings
 * (design.md §8).
 */
export type SemType =
  PrimType | NominalType | ParamType;

/**
 * A shared primitive (`integer`, `string`, …).
 */
export type PrimType = Box<
  "PrimType",
  Readonly<{ name: PrimName }>
>;

/**
 * A nominal domain type (`client-id`,
 * `email-address`): equal only to itself by name.
 */
export type NominalType = Box<
  "NominalType",
  Readonly<{ name: SoftStr }>
>;

/**
 * A parameterized domain type (`(money JPY)`): a
 * constructor name plus symbolic tags; equal only when
 * name and every tag match (`Money<JPY> ≠ Money<USD>`,
 * design.md §8).
 */
export type ParamType = Box<
  "ParamType",
  Readonly<{
    name: SoftStr;
    tags: ReadonlyArray<SoftStr>;
  }>
>;

/** Builds a {@link PrimType}. */
export const primType = (
  name: PrimName,
): PrimType => box("PrimType")({ name });

/** The shared `boolean` primitive. */
export const booleanType: PrimType =
  primType("boolean");

/** The shared `integer` primitive. */
export const integerType: PrimType =
  primType("integer");

/** The shared `decimal` primitive. */
export const decimalType: PrimType =
  primType("decimal");

/** The shared `string` primitive. */
export const stringType: PrimType =
  primType("string");

/** The shared `date` primitive. */
export const dateType: PrimType =
  primType("date");

/** Builds a {@link NominalType}. */
export const nominalType = (
  name: SoftStr,
): NominalType => box("NominalType")({ name });

/** Builds a {@link ParamType}. */
export const paramType = (
  name: SoftStr,
  tags: ReadonlyArray<SoftStr>,
): ParamType => box("ParamType")({ name, tags });

/** Type guard: is this {@link SemType} a {@link PrimType}? */
export const isPrimType =
  isBoxWithTag("PrimType");

/** Type guard: is this {@link SemType} a {@link NominalType}? */
export const isNominalType = isBoxWithTag(
  "NominalType",
);

/** Type guard: is this {@link SemType} a {@link ParamType}? */
export const isParamType =
  isBoxWithTag("ParamType");

/** `match` pattern for a {@link PrimType}. */
export const primType$ = () =>
  pattern("PrimType")();

/** `match` pattern for a {@link NominalType}. */
export const nominalType$ = () =>
  pattern("NominalType")();

/** `match` pattern for a {@link ParamType}. */
export const paramType$ = () =>
  pattern("ParamType")();

/**
 * Structural equality of two {@link SemType}s: same
 * shape, same name, and (for parameterized types)
 * identical tags in order.
 */
export const semTypeEquals =
  (a: SemType) =>
  (b: SemType): boolean =>
    match(a)(
      [
        primType$(),
        ({ content }): boolean =>
          isPrimType(b) &&
          b.content.name === content.name,
      ],
      [
        nominalType$(),
        ({ content }): boolean =>
          isNominalType(b) &&
          b.content.name === content.name,
      ],
      [
        paramType$(),
        ({ content }): boolean =>
          isParamType(b) &&
          b.content.name === content.name &&
          b.content.tags.length ===
            content.tags.length &&
          content.tags.every((tag, i) =>
            b.content.tags
              .slice(i, i + 1)
              .every((other) => other === tag),
          ),
      ],
    );

/**
 * May a value of type `actual` be used where
 * `expected` is required? Structural equality, plus
 * the one shared widening: `integer` is usable as
 * `decimal`.
 */
export const isAssignable =
  (expected: SemType) =>
  (actual: SemType): boolean =>
    semTypeEquals(expected)(actual) ||
    (isPrimType(expected) &&
      expected.content.name === "decimal" &&
      isPrimType(actual) &&
      actual.content.name === "integer");

/**
 * Formats a {@link SemType} for diagnostics
 * (`integer`, `client-id`, `(money JPY)`).
 */
export const formatSemType = (
  t: SemType,
): SoftStr =>
  match(t)(
    [
      primType$(),
      ({ content }): SoftStr => content.name,
    ],
    [
      nominalType$(),
      ({ content }): SoftStr => content.name,
    ],
    [
      paramType$(),
      ({ content }): SoftStr =>
        `(${[content.name, ...content.tags].join(" ")})`,
    ],
  );
