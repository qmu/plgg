# Check links and frontmatter

During `plggpress build`, the checker compares internal links in the content against the routes and heading IDs of the site. For `unknown route`, check the source link and destination filename. For `unknown anchor`, check the heading at the destination. These checks run before the build replaces the output directory.

External sites, the 404 page, and files with extensions are outside the route check. Use `srcExclude: ["/drafts/**"]` to leave drafts out of the build. Use `linkIgnore` for targets such as extensionless downloads. Match the emitted link, including its base path, when writing an ignore pattern.

## Require fields for a collection

Suppose every inventory record needs an item name and a quantity. Add the following declaration to the config file and include `models` in the default-exported config object. The binding matches a route prefix, so include the trailing slash to select a directory.

```ts
import { bindModel, contentModel, numberField, textField } from "plggpress";

const models = [bindModel("/inventory/", contentModel("Stock", [
  textField("item"), numberField("quantity"),
  textField("location", false),
]))];
```

Start `inventory/pencils.md` with this YAML block. The `location` field is optional. If you leave out `quantity` or enter a word in its place, the build reports the page and the reason it failed.

```markdown
---
item: Pencils
quantity: 12
---

# Pencils
```

Use `booleanField` for a true/false value, `listField` for a list of scalars of one kind, and `groupField` for a group of fields. Only pages under a bound prefix are checked against its model. See the [CLI reference](/cli/) for build options.
