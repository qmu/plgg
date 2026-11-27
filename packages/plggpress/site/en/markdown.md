# Markdown and links

Place `index.md` at the root of your content directory for the home page. A file named `notes/tools.md` becomes `/notes/tools/`, while `notes/index.md` becomes `/notes/`. Use a level-one heading for the title shown on the column and the browser tab.

## Link to a page or heading

From another file in `notes/`, write `[Tools](./tools.md)`. To start from the site root, write `[Tools](/notes/tools/)`. If the site is built under `/en/`, both links stay within the English edition. Their destination is the same whichever column contains the link.

Link to a heading such as `## Packing list` with `[List](#packing-list)`. From another page, append `#packing-list` to its path. After renaming a heading, [check the links](/checks/) that point to it.

## Show code and callouts

Wrap a code block in backticks and add a language name on the opening line for syntax highlighting. Use a `tip` callout for a suggestion, `warning` for a caution, or `danger` for a critical warning.

~~~~markdown
```ts
const copies = 2;
```

::: tip
Keep a spare copy.
:::
~~~~

For an image, put the file in `public/images/kit.png` under the content directory and write `![Packing kit](/images/kit.png)`. For a diagram the reader can manipulate, see [Embedding diagrams](/sheets/).
