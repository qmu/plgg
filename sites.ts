// The qmu sites that are joined by columns: a link from
// one to a page of another opens that page beside, in a
// frame of its own. Every one of them is a plggpress site;
// each names the others as the sites it opens (partners)
// and as the sites that may open it (embedders). Kept in
// one place so no site's list can fall behind.
export const qmuSites: readonly string[] = [
  "https://qmu.co.jp",
  "https://plgg.qmu.co.jp",
  "https://plggpress.qmu.co.jp",
  "https://plggmatic.qmu.co.jp",
  "https://plgg-flow.qmu.co.jp",
  "https://hrns.qmu.co.jp",
  "https://research.qmu.co.jp",
];

/** The sites a site is joined to: all of them but itself. */
export const joinedTo = (
  self: string,
): Readonly<{
  partners: readonly string[];
  embedders: readonly string[];
}> => ({
  partners: qmuSites.filter((s) => s !== self),
  embedders: qmuSites.filter((s) => s !== self),
});
