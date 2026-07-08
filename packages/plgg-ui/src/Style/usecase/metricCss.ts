import { type SoftStr } from "plgg";
import {
  type Metric,
  metrics,
  metricValue,
} from "plgg-ui/Style/model/metric";
import { cssPrefix } from "plgg-ui/Meta/model/identity";

/**
 * The shell-metric custom properties as a single
 * scheme-INDEPENDENT `:root` block
 * (`--pm-shell-max:1440px;…`), in {@link metrics} order.
 * Mirrors `schemeCss`'s single-source contract, but
 * without a `html.dark` override — geometry does not
 * change by light/dark. Escape-safe (no `<`, `>`, `&`) so
 * it survives an SSR text escaper byte-for-byte; inject
 * ahead of the collected atomic rules so every
 * `var(--pm-*)` metric reference resolves.
 */
export const metricCss: SoftStr = `:root{${metrics
  .map(
    (m: Metric) =>
      `--${cssPrefix}-${m}:${metricValue(m)};`,
  )
  .join("")}}`;
