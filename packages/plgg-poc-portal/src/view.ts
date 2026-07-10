/**
 * The portal page as one pure view: PoC cards (question,
 * confidence signal, status, verdict, link) above the
 * fleet's hostname/port allocation table. Static output —
 * no messages, no client runtime — so the `Msg` parameter
 * is `never` throughout. Styling uses the plgg-view style
 * atoms; status is always shown as a text label alongside
 * its tone color, never by color alone.
 */
import type { SoftStr } from "plgg";
import {
  type Html,
  div,
  section,
  header,
  h1,
  h2,
  p,
  a,
  span,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
  text,
  href,
  attr,
} from "plgg-view";
import * as sx from "plgg-view/style";
import {
  type Poc,
  type PocStatus,
  STATUS_LABEL,
  isLinkable,
  verdictText,
} from "./Poc.ts";
import {
  PORTAL_HOSTNAME,
  PORTAL_PORT,
} from "./pocs.ts";

/**
 * Status → badge tone. A concluded-negative status reads
 * `danger`; everything else stays in the calm range. The
 * `Record` keeps the mapping exhaustive over PocStatus.
 */
const STATUS_TONE: Readonly<
  Record<PocStatus, sx.Styles>
> = {
  planned: sx.color("muted"),
  building: sx.color("primary"),
  proven: sx.color("primary"),
  disproven: sx.color("danger"),
  "needs-another-round": sx.color("danger"),
};

const statusBadge = (
  status: PocStatus,
): Html<never, "span"> =>
  span(
    [
      sx.style_(
        `poc-status-${status}`,
        STATUS_TONE[status],
        sx.text("sm"),
        sx.weight(600),
        sx.border,
        sx.rounded("full"),
        sx.px(2),
      ),
    ],
    [text(STATUS_LABEL[status])],
  );

/** A labelled line inside a card ("Question: …"). */
const field = (
  label: SoftStr,
  value: SoftStr,
): Html<never, "p"> =>
  p(
    [sx.style_("poc-field", sx.mt(1), sx.mb(0))],
    [
      span(
        [
          sx.style_(
            "poc-field-label",
            sx.weight(600),
            sx.color("muted"),
          ),
        ],
        [text(`${label}: `)],
      ),
      text(value),
    ],
  );

/**
 * Where the PoC runs: a live link once it is building or
 * concluded, plain reserved-hostname text while planned —
 * the portal never renders a dead link.
 */
const pocLocation = (
  poc: Poc,
): Html<never, "p"> =>
  isLinkable(poc.status)
    ? p(
        [sx.style_("poc-link-line", sx.mt(1))],
        [
          a(
            [
              href(`https://${poc.hostname}/`),
              sx.style_(
                "poc-link",
                sx.color("primary"),
                sx.weight(600),
              ),
            ],
            [text(`https://${poc.hostname}/`)],
          ),
          span(
            [
              sx.style_(
                "poc-port",
                sx.color("muted"),
                sx.text("sm"),
              ),
            ],
            [text(` (localhost:${poc.port})`)],
          ),
        ],
      )
    : p(
        [
          sx.style_(
            "poc-reserved",
            sx.mt(1),
            sx.color("muted"),
            sx.text("sm"),
          ),
        ],
        [
          text(
            `Reserved: ${poc.hostname} (localhost:${poc.port}) — not yet serving`,
          ),
        ],
      );

const pocCard = (
  poc: Poc,
): Html<never, "section"> =>
  section(
    [
      attr("id", poc.id),
      sx.style_(
        "poc-card",
        sx.border,
        sx.rounded("md"),
        sx.p(3),
        sx.mb(3),
        sx.bg("surface"),
      ),
    ],
    [
      h2(
        [
          sx.style_(
            "poc-title",
            sx.text("xl"),
            sx.mb(1),
          ),
        ],
        [
          text(`${poc.name} `),
          statusBadge(poc.status),
        ],
      ),
      field("Question", poc.question),
      field(
        "Proven when",
        poc.confidenceSignal,
      ),
      field(
        "Verdict",
        verdictText(poc.verdict),
      ),
      pocLocation(poc),
    ],
  );

const mapRow = (
  hostname: SoftStr,
  port: number,
  app: SoftStr,
): Html<never, "tr"> =>
  tr(
    [],
    [
      td(
        [sx.style_("map-cell", sx.p(1), sx.border)],
        [text(hostname)],
      ),
      td(
        [sx.style_("map-cell", sx.p(1), sx.border)],
        [text(`${port}`)],
      ),
      td(
        [sx.style_("map-cell", sx.p(1), sx.border)],
        [text(app)],
      ),
    ],
  );

const allocationTable = (
  pocs: ReadonlyArray<Poc>,
): Html<never, "table"> =>
  table(
    [sx.style_("map-table", sx.mt(2))],
    [
      thead(
        [],
        [
          tr(
            [],
            [
              th(
                [
                  sx.style_(
                    "map-head",
                    sx.p(1),
                    sx.border,
                    sx.left,
                  ),
                ],
                [text("Hostname")],
              ),
              th(
                [
                  sx.style_(
                    "map-head",
                    sx.p(1),
                    sx.border,
                    sx.left,
                  ),
                ],
                [text("Port")],
              ),
              th(
                [
                  sx.style_(
                    "map-head",
                    sx.p(1),
                    sx.border,
                    sx.left,
                  ),
                ],
                [text("App")],
              ),
            ],
          ),
        ],
      ),
      tbody(
        [],
        [
          mapRow(
            PORTAL_HOSTNAME,
            PORTAL_PORT,
            "PoC portal (this page)",
          ),
          ...pocs.map((poc) =>
            mapRow(
              poc.hostname,
              poc.port,
              poc.name,
            ),
          ),
        ],
      ),
    ],
  );

/**
 * The whole portal page from the PoC records. Total over
 * its input: an empty fleet renders an honest empty state
 * instead of a blank list.
 */
export const view = (
  pocs: ReadonlyArray<Poc>,
): Html<never, "div"> =>
  div(
    [
      sx.style_(
        "portal",
        sx.maxW(200),
        sx.mx(4),
        sx.my(4),
        sx.color("text"),
      ),
    ],
    [
      header(
        [sx.style_("portal-header", sx.mb(3))],
        [
          h1(
            [sx.style_("portal-title", sx.text("2xl"))],
            [text("plggpress PoC portal")],
          ),
          p(
            [sx.style_("portal-intro", sx.color("muted"))],
            [
              text(
                "Each open technical question on the road to the next plggpress (SSG + Browser RAG) gets one small, discardable PoC. This page is the fleet's index: what each PoC asks, what observation counts as proven, and the verdict once measured.",
              ),
            ],
          ),
        ],
      ),
      section(
        [sx.style_("portal-pocs", sx.mb(4))],
        pocs.length === 0
          ? [
              p(
                [
                  sx.style_(
                    "portal-empty",
                    sx.color("muted"),
                  ),
                ],
                [
                  text(
                    "No PoCs planned yet — the fleet data in src/pocs.ts is empty.",
                  ),
                ],
              ),
            ]
          : pocs.map(pocCard),
      ),
      section(
        [sx.style_("portal-map")],
        [
          h2(
            [sx.style_("map-title", sx.text("lg"))],
            [
              text(
                "Fleet allocation (cloudflared tunnel qmu-dev)",
              ),
            ],
          ),
          allocationTable(pocs),
          p(
            [
              sx.style_(
                "map-note",
                sx.color("muted"),
                sx.text("sm"),
                sx.mt(1),
              ),
            ],
            [
              text(
                "Ports 5183–5190 are reserved for this fleet; the ingress mapping is applied by the developer in ~/.cloudflared/config.yml (see the package README).",
              ),
            ],
          ),
        ],
      ),
    ],
  );
