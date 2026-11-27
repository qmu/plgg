# CLI reference

Use `plggpress build` to write static files or `plggpress dev` to start a local authoring server. These examples assume your content is in `docs`.

```sh
npx plggpress dev --contentDir docs --port 5173
npx plggpress build --contentDir docs --outDir dist
```

| Setting | Use |
| --- | --- |
| `--config <path>` | Both commands. Defaults to `site.config.ts` in the working directory. |
| `--contentDir <path>` | Both. Build defaults to the working directory. Dev prefers `docs/` if it exists, then the working directory. |
| `--parts <path>` | Both. Select a part registration module. By default, loads `site.parts.ts` beside the config if present. |
| `--outDir <path>` | Build output directory. Defaults to `dist/` in the working directory. |
| `--port <number>` | Dev TCP port, default `5173`. Use `0` for an available port. |
| `--host <host>` | Adds a hostname to the dev settings. It does not select a listening address. |
| `--watch-theme` | Also watch the plggpress source during development. |

## Preview edits

Saving an existing Markdown file tells open pages to reload. Restart the server after changing the config or adding a page so it reads the new settings and route list. Before publishing, run `build` to [validate the content](/checks/).

Set `OPENAI_API_KEY` in the dev server’s environment to enable the voice panel. You can ask it to edit the open document or move to a heading. The browser receives a short-lived credential, and edits are saved to the source file. The panel is available only during development.
