/**
 * The PoC record — the portal's whole domain. Each
 * plggpress confidence-collection PoC is one immutable
 * value carrying the question it answers, the observation
 * that counts as "proven" (the confidence signal), where
 * it runs, and the verdict once measured. The mission
 * (`plggpress-technical-confidence-poc-portal`) reads its
 * progress off these records, so the shape stays small
 * and stable: later PoC tickets only edit data, not types.
 */
import {
  type SoftStr,
  type Option,
  pipe,
  getOr,
  isSome,
  isNone,
} from "plgg";

/**
 * The PoC lifecycle as a closed union. `Record`-keyed
 * lookups over it are exhaustive by construction — adding
 * a status without its label/tone is a type error.
 */
export type PocStatus =
  | "planned"
  | "building"
  | "proven"
  | "disproven"
  | "needs-another-round";

/** One confidence-collection PoC. */
export type Poc = Readonly<{
  /** Stable slug, e.g. `poc1`. */
  id: SoftStr;
  name: SoftStr;
  /** The technical question this PoC answers. */
  question: SoftStr;
  /** What observation counts as "proven". */
  confidenceSignal: SoftStr;
  status: PocStatus;
  /**
   * The measured outcome, present only after the PoC
   * concluded (`proven` / `disproven` /
   * `needs-another-round`).
   */
  verdict: Option<SoftStr>;
  /** The `*.qmu.dev` hostname serving this PoC. */
  hostname: SoftStr;
  /** The local port the cloudflared tunnel maps to. */
  port: number;
}>;

export const STATUS_LABEL: Readonly<
  Record<PocStatus, SoftStr>
> = {
  planned: "Planned",
  building: "Building",
  proven: "Proven",
  disproven: "Disproven",
  "needs-another-round":
    "Needs another round",
};

/**
 * Whether the status is a concluded one — concluded PoCs
 * must carry a verdict (see {@link pocConsistent}).
 */
export const isConcluded = (
  status: PocStatus,
): boolean =>
  status === "proven" ||
  status === "disproven" ||
  status === "needs-another-round";

/**
 * A running PoC has a live URL worth linking; a `planned`
 * one has only a reserved hostname (the portal renders it
 * as text, never as a dead link).
 */
export const isLinkable = (
  status: PocStatus,
): boolean => status !== "planned";

/**
 * The verdict as display text — an absent verdict is an
 * honest "Not yet run", never a blank.
 */
export const verdictText = (
  verdict: Option<SoftStr>,
): SoftStr =>
  pipe(verdict, getOr("Not yet run"));

/**
 * Data invariant the spec pins: a concluded PoC carries a
 * verdict, an unconcluded one does not claim one.
 */
export const pocConsistent = (
  poc: Poc,
): boolean =>
  isConcluded(poc.status)
    ? isSome(poc.verdict)
    : isNone(poc.verdict);
