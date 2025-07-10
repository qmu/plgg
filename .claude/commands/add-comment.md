- Add source code comments in `$ARGUMENT`.
- Simple and precise comments for every major code block like exported function declarations.
- Basically less comments better, you can skip the comment if it's obvious.
- Update existing comments too.
- JSDoc style for function declarations, but not for variables or code blocks like below:

```ts
/**
 * Right comment placement for function
 */
const func = () => {
  // Right comment placement for code block
  console.log(someVariable); // Wrong comment placement
}
```
