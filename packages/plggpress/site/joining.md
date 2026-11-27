# Sites joined by columns

A plggpress site opens its own pages beside one another, as columns. Two plggpress sites can be joined so that a link from one to a page of the other opens that page as the next column too, instead of leaving the site.

## Naming the sites

Each site names the others in its `site.config.ts`.

```ts
export default {
  // …
  // the sites whose pages this site opens as columns
  partners: ["https://docs.example.com"],
  // the sites that may open this site's pages as columns
  embedders: ["https://example.com"],
  // other origins this site already holds in a frame
  frames: ["https://challenges.cloudflare.com"],
};
```

Every entry is an exact origin: `https://` and a host, with no path and no wildcard. Anything looser is refused when the config is read. `http://` is accepted for `localhost` only.

A column opens only when both sides agree: the opening site lists the other as a partner, and the other lists the opening site as an embedder.

## What a reader sees

- A link in a column to a partner's page opens that page as the next column.
- A link inside that column opens a further column, whether it leads to the partner or back to the opening site.
- The address carries the whole strip, so reloading or sharing it restores the same columns.
- Switching between light and dark on the opening site switches the partner's columns with it.
- A sideways scroll made over a partner's column moves the strip to the neighbouring column.
- A partner that does not answer within four seconds — it is down, or does not allow the framing — is not kept as a column: the link is followed as an ordinary one.

## How it is kept safe

A partner's page is never fetched and never placed in the opening site's document. It is shown in a frame of its own, where the browser keeps it apart.

| What is prevented | Who enforces it |
|---|---|
| A stranger's page in a column | the page's script (the list is written into the page when the site is built; the address cannot extend it) and the browser (`frame-src`) |
| A partner's page handing its column on to a stranger by redirecting | the browser (`frame-src`) |
| A framed page reading or changing the opening site | the browser (cross-origin isolation) |
| A framed page moving the opening site or opening windows | the browser (the frame's sandbox) |
| A forged message opening a column | the page's script: a message counts only when its origin is a partner, its sender is a frame this page opened, and that frame was opened for that partner |
| A stranger framing this site | a response header (`frame-ancestors`), written to `_headers` by the build |

A framed page can say two things to the site it stands in: its title, which is used as text, and a link to open beside it, which is opened only when it leads to the opening site or to a partner. The opening site says one thing to a framed page: light or dark.

What is trusted is the partner itself. If a partner's site is compromised, what its columns show can change; the opening site's own pages cannot be touched from there.

## Hosting

`_headers` is read by Cloudflare's static asset hosting. A host that ignores it serves the site without the `frame-ancestors` header, and the site can then be framed by anyone.
