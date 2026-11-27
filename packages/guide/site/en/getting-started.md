# Run your first program

Suppose a reader enters a book title. In a Node.js project, run `npm install plgg` and save this code as `title.mjs`.

```js
import { asStr, isOk } from "plgg";

const title = asStr(process.argv[2]);
if (isOk(title)) {
  console.log(title.content.content);
} else {
  console.log(title.content.content.message);
}
```

Run `node title.mjs Atlas` to print `Atlas`. Omit the argument to see the validation error instead. On success, the first `content` retrieves the `Str` inside the `Ok`, and the second retrieves the string inside the `Str`.

## Run the workspace examples

The repository uses npm workspaces for examples that combine packages. The script below prepares dependencies and builds the packages in order. After it finishes, try the [to-do application](/packages/example/).

```sh
git clone https://github.com/qmu/plgg.git
cd plgg
sh scripts/build.sh
```
