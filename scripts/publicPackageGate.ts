/** Shared diagnostics for the publisher's pre-publication checks. */
export class PublicPackageFailure extends Error {}

type GateContext = Readonly<{
  name: string;
  version: string;
  dir: string;
  phase: "stage" | "pack";
}>;

const shellQuote = (value: string): string =>
  `'${value.replaceAll("'", "'\\''")}'`;

const failureStatus = (
  error: unknown,
): string => {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return "";
  }
  if (
    "status" in error &&
    typeof error.status === "number"
  ) {
    return ` (exit ${error.status})`;
  }
  if (
    "code" in error &&
    typeof error.code === "string" &&
    /^E[A-Z0-9_]+$/.test(error.code)
  ) {
    return ` (${error.code})`;
  }
  return "";
};

/** Never suggest repeating an irreversible publish to reproduce a defect. */
export const checkPublicPackage = <T>(
  context: GateContext,
  check: () => T,
): T => {
  try {
    return check();
  } catch (error) {
    // Child-process errors can include ambient credentials in their output.
    // Only our explicitly authored validation failures are safe to print.
    const reason =
      error instanceof PublicPackageFailure
        ? error.message
        : `${context.phase} operation failed${failureStatus(error)}; check local files and npm availability`;
    throw new PublicPackageFailure(
      [
        `public-package gate FAILED: ${context.name}@${context.version}`,
        `phase: ${context.phase}`,
        `reason: ${reason}`,
        `reproduce (from repository root; no publish): node scripts/publish.ts --dry-run --only ${shellQuote(context.dir)}`,
      ].join("\n"),
    );
  }
};
