import { type SoftStr } from "plgg";

/**
 * One page of the corpus as it arrives from the reader:
 * the route it is served at, and the raw source INCLUDING
 * its frontmatter fence.
 *
 * This is plgg-cms's own vocabulary for the reader's
 * output, deliberately not plggpress's `Page`. The two are
 * structurally identical today, and that is exactly why the
 * boundary is written down rather than assumed: the
 * ingester's domain signatures must not name a foreign
 * package's type, or a change to plggpress's build-time
 * model check propagates into this package's domain by
 * accident.
 */
export type SourcePage = Readonly<{
  path: SoftStr;
  source: SoftStr;
}>;
